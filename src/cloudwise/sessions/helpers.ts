import { cache_manager, logger } from "akeyless-server-commons/managers";
import { EvseStatus, ParsedConnectorData, ParsedOcpiLocationData } from "../types";
import { Timestamp } from "firebase-admin/firestore";
import { get_session_status, get_config, get_location_details, session_command } from "../api/helpers";
import moment from "moment";
import { parse_cdr, parse_eves, parse_location } from "../helpers";
import { ChargingState, ClosestUpdatedLocationResult, GetDistanceMetersOptions, GetLocationsByGeoAndStatusOptions, ChargingSession } from "./types";
import { SessionCommandSettings } from "../api/types";
import { set_document, sleep } from "akeyless-server-commons/helpers";

/// ------------------ get locations by geo and status ------------------
export const get_distance_meters = ({ lat1, lat2, lng1, lng2 }: GetDistanceMetersOptions): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const get_locations_by_geo_and_status = async ({
    lat,
    lng,
    radius_in_meters = 500,
    status = "BLOCKED",
}: GetLocationsByGeoAndStatusOptions): Promise<ParsedOcpiLocationData[]> => {
    const locations: ParsedOcpiLocationData[] = cache_manager.getArrayData("cloudwise-locations");
    const locations_data = locations.filter((location) => {
        const distance = get_distance_meters({
            lat1: lat,
            lng1: lng,
            lat2: location.lat,
            lng2: location.lng,
        });
        return distance <= radius_in_meters;
    });

    const result = await Promise.all(
        locations_data.map(async (location) => {
            const location_details = await get_location_details(location.id, { party_id: location.party_id });
            const parsed_location = parse_location(location_details.Location);
            const parsed_evses = location_details.Evses.map(parse_eves);
            return {
                ...parsed_location,
                stations: parsed_evses,
                company_name: location.company_name,
                party_id: location.party_id,
            };
        })
    );
    return result.filter((location) => location.stations.some((station) => station.status === status));
};

/// ------------------ start session helpers------------------
const get_session_connector = (connectors: ParsedConnectorData[]): ParsedConnectorData => {
    if (connectors.length === 1) {
        return connectors[0];
    } else {
        return connectors.find((connector) => connector.standard !== "CHADEMO") || connectors[0];
    }
};

const get_closest_updated_location = (
    locations: ParsedOcpiLocationData[],
    timestamp: Timestamp,
    status: EvseStatus = "BLOCKED"
): ClosestUpdatedLocationResult => {
    let closestDiff = Number.POSITIVE_INFINITY;
    let closestResult: ClosestUpdatedLocationResult | null = null;

    locations.forEach((location) => {
        location.stations
            .filter((station) => station.status === status)
            .forEach((station) => {
                const diff = Math.abs(timestamp.toMillis() - station.last_updated.toMillis());
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closestResult = {
                        location,
                        station,
                        last_updated: moment(station.last_updated.toDate()).format("YYYY-MM-DD HH:mm:ss"),
                        connector: get_session_connector(station.connectors),
                    };
                }
            });
    });

    if (!closestResult) {
        const firstLocation = locations[0];
        const firstStation = firstLocation.stations[0];
        return {
            location: firstLocation,
            station: firstStation,
            last_updated: moment(firstStation.last_updated.toDate()).format("YYYY-MM-DD HH:mm:ss"),
            connector: get_session_connector(firstStation.connectors),
        };
    }

    return closestResult;
};

const get_start_session_settings = async (charging_state_object: ChargingState): Promise<SessionCommandSettings> => {
    const { lat, lng, timestamp, car_number } = charging_state_object;
    await sleep(3000);
    let data: ParsedOcpiLocationData[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
        data = await get_locations_by_geo_and_status({
            lat,
            lng,
            status: "BLOCKED",
        });

        if (data.length > 0) {
            break;
        }

        if (attempt < 3) {
            await sleep(10000);
        }
    }

    if (data.length === 0) {
        throw new Error("No locations found after 3 attempts");
    }

    const {
        location: { party_id, id: location_id },
        station: { uid: station_uid },
        connector: { id: connector_id },
    } = get_closest_updated_location(data, timestamp, "BLOCKED");

    const { asset_id, ble_id, device_id } = get_config();
    const command_options: SessionCommandSettings = {
        asset_id,
        ble_id,
        device_id,
        location_id,
        party_id,
        station_uid,
        connector_id,
        command: "START_SESSION",
    };
    return command_options;
};

/// ------------------ start session ------------------
// TODO: remove interval after testing
export const start_session = async (charging_state_object: ChargingState) => {
    const { car_number } = charging_state_object;
    logger.log(`Starting session for car: "${car_number}" ...`);
    try {
        const command_settings = await get_start_session_settings(charging_state_object);
        const start_session_response = await session_command(command_settings);
        const { CommandId: session_id } = start_session_response;
        logger.log(`🟢 Session "${session_id}" started for car: "${car_number}"`);
        if (!session_id) {
            throw new Error("Session id not found in start session response");
        }
        delete command_settings.command;
        delete command_settings.party_id;
        const session: ChargingSession = {
            ...command_settings,
            car_number,
            status: "started",
            start_timestamp: Timestamp.now(),
            timestamp: Timestamp.now(),
        };
        await set_document("cloudwise-sessions", session_id, session);
        await set_document("cloudwise-charging-state", car_number, {
            ...charging_state_object,
            status: "charging",
            session_id,
            timestamp: Timestamp.now(),
        });

        ///  interval for test during session
        // setInterval(async () => {
        //     const { asset_id, ble_id, device_id } = get_config();
        //     const res = await get_session_status({ asset_id, ble_id, session_id, device_id });
        //     console.log("get_session_status", res);
        // }, 5 * 1000);
    } catch (error) {
        logger.error("🔴 Error in send_command_helper", error);
        await set_document("cloudwise-charging-state", car_number, { ...charging_state_object, status: "error", timestamp: Timestamp.now() });
    }
};

/// ------------------ end session ------------------
export const stop_session = async (session_id: string) => {
    logger.log(`Stopping session: "${session_id}" ...`);
    try {
        const sessions: ChargingSession[] = cache_manager.getArrayData("cloudwise-sessions");
        const session = sessions.find((session) => session.id === session_id);
        if (!session) {
            throw new Error("Session not found");
        }
        const config: SessionCommandSettings & Partial<ChargingSession> = {
            ...session,
            command: "STOP_SESSION",
            session_id: session.id,
            timestamp: Timestamp.now(),
        };
        delete config.status;
        delete config.car_number;
        delete config.id;
        await session_command(config);
        logger.log(`🔵 Session "${session_id}" stopped`);

        /// update session status
        await set_document("cloudwise-sessions", session_id, {
            ...session,
            status: "completed",
            timestamp: Timestamp.now(),
            end_timestamp: Timestamp.now(),
        });
        await set_document("cloudwise-charging-state", session.car_number, { status: "plugout", session_id: "", timestamp: Timestamp.now() });

        /// async update session and cdr (if exists)
        setTimeout(async () => {
            const { asset_id, ble_id, device_id } = get_config();
            const {
                CommandStatus: session_status,
                Cost: cost = 0,
                Count: count = 0,
                KWh: kwh = 0,
                ChargingTimeInSeconds: charging_time_in_seconds,
                Cdr: cdr,
            } = await get_session_status({ asset_id, ble_id, session_id, device_id });

            if (session_status.includes("COMPLETED")) {
                const update: any = { cost, count, kwh, charging_time_in_seconds, timestamp: Timestamp.now() };
                if (cdr) {
                    const parsed_cdr = parse_cdr(cdr);
                    const cdr_id = parsed_cdr.id;
                    delete parsed_cdr.id;
                    update.cdr_id = cdr_id;
                    await set_document("cloudwise-cdrs", cdr_id!, {
                        ...parsed_cdr,
                        session_id,
                        car_number: session.car_number,
                        timestamp: Timestamp.now(),
                    });
                }
                await set_document("cloudwise-sessions", session_id, update);
            }
        }, 30 * 1000);
    } catch (error) {
        logger.error(`🔴 Error in stop session: ${session_id}`, error);
    }
};

/// ------------------ handle active session ------------------
export const handle_active_session = async (session_id: string) => {
    let timer: NodeJS.Timeout | undefined;
    const run = async () => {
        const { asset_id, ble_id, device_id } = get_config();
        try {
            const { CommandStatus } = await get_session_status({ asset_id, ble_id, session_id, device_id });
            if (CommandStatus.includes("ACTIVE")) {
                timer = setTimeout(run, 30 * 1000);
            } else {
                if (timer) {
                    clearTimeout(timer);
                }
                setTimeout(async () => {
                    const sessions = cache_manager.getArrayData("cloudwise-sessions");
                    const session = sessions.find((session) => session.id === session_id);
                    if (session && session.status !== "completed") {
                        await stop_session(session_id);
                    }
                }, 10 * 1000);
            }
        } catch (error) {
            logger.error("🔴 Error in handle_active_session", error);
            if (timer) {
                clearTimeout(timer);
            }
            const sessions = cache_manager.getArrayData("cloudwise-sessions");
            const session = sessions.find((session) => session.id === session_id);
            if (session) {
                await set_document("cloudwise-sessions", session_id, { status: "error", timestamp: Timestamp.now(), end_timestamp: Timestamp.now() });
            }
        }
    };

    await run();
};

/// ------------------ handle charging state add and edit ------------------
const handle_status_change = async (charging_state_object: ChargingState) => {
    const { status, car_number } = charging_state_object;
    if (!["1234567890", "20326304", "86913103"].includes(car_number)) {
        return;
    }
    switch (status) {
        case "plugin":
            await start_session(charging_state_object);
            break;
        case "charging":
            await handle_active_session(charging_state_object.session_id!);
            break;
        case "plugout":
        case "error":
            if (charging_state_object.session_id?.length) {
                logger.warn(`🔴 Stopping session from status snapshot ...  `);
                await stop_session(charging_state_object.session_id);
            }
            break;

        default:
            break;
    }
};

export const handle_charging_state_add_and_edit = (data: ChargingState[]) => {
    let prev: ChargingState[] = cache_manager.getArrayData("cloudwise-charging-state");
    data.forEach((new_car) => {
        const old_car = prev.find((old) => old.car_number === new_car.car_number);
        if (!old_car) {
            handle_status_change(new_car);
            prev = [...prev, new_car];
            return;
        }

        if (new_car.status !== old_car.status) {
            handle_status_change(new_car);
        }
        prev = prev.map((old) => (old.car_number === new_car.car_number ? new_car : old));
    });
    cache_manager.setArrayData("cloudwise-charging-state", prev);
};
