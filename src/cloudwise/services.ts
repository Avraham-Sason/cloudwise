import { Service } from "akeyless-server-commons/types";
import { get_location_details } from "./api/helpers";
import { json_failed, json_ok } from "akeyless-server-commons/helpers";
import { get_cdrs as get_cdrs_helper, parse_eves, parse_location } from "./helpers";
import { cache_manager, logger } from "akeyless-server-commons/managers";
import { ParsedOcpiLocationData } from "./types";
import { stop_session as stop_session_helper } from "./sessions/helpers";

export const get_location_status: Service = async (req, res) => {
    const { id } = req.params;
    try {
        const location: ParsedOcpiLocationData | undefined = cache_manager.getArrayData("cloudwise-locations").find((v) => v.id === id);
        if (!location) {
            throw new Error("Location not found");
        }
        const location_details = await get_location_details(id, { party_id: location.party_id });
        const parsed_location = parse_location(location_details.Location);
        const parsed_evses = location_details.Evses.map(parse_eves);
        res.json(json_ok({ ...parsed_location, stations: parsed_evses }));
    } catch (error) {
        res.json(json_failed(error));
        logger.error(`Error in get_location_status, location id: ${id}`, error);
    }
};

export const stop_session: Service = async (req, res) => {
    const { session_id } = req.body;
    try {
        await stop_session_helper(session_id);
        res.json(json_ok({ message: "Session stopped" }));
    } catch (error) {
        res.json(json_failed(error));
        logger.error(`Error in stop_session, session id: ${session_id}`, error);
    }
};

export const get_cdrs: Service = async (req, res) => {
    const { car_number, limit, offset } = req.body;
    try {
        const cdrs = get_cdrs_helper(car_number, { limit, offset });
        res.json(json_ok({ cdrs }));
    } catch (error) {
        res.json(json_failed(error));
        logger.error(`Error in get_cdrs, car number: ${car_number}`, error);
    }
};
