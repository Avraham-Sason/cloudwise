import { cache_manager } from "akeyless-server-commons/managers";
import { EvseStatus, ParsedOcpiLocationData, ParsedEvseData } from "../types";
import { Timestamp } from "firebase-admin/firestore";
import { get_location_details } from "../api/helpers";
import { parse_eves, parse_location } from "./parsers";
import moment from "moment";

type ChargingStatus = "plugin" | "charging" | "plugout" | "error";

interface ChargingState {
    id: string;
    status: ChargingStatus;
    car_number: string;
    lat: number;
    lng: number;
}

export const parse_charging_add_edit = (data: ChargingState[]) => {
    data.forEach((car) => {
        const { status, car_number, lat, lng } = car;
        switch (status) {
            case "plugin":
                break;
            case "charging":
                break;
            case "plugout":
                break;
            case "error":
                break;
            default:
                break;
        }
    });
};

interface GetDistanceMetersOptions {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
}

const get_distance_meters = ({ lat1, lat2, lng1, lng2 }: GetDistanceMetersOptions): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface GetLocationsByGeoAndStatusOptions {
    lat: number;
    lng: number;
    radius_in_meters?: number;
    status?: EvseStatus;
}

export const get_locations_by_geo_and_status = async ({
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
        const has_inoperative_station = location.stations.some((station) => station.status === status);
        return distance <= radius_in_meters && has_inoperative_station;
    });
    if (locations_data.length === 0) {
        return [];
    }
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
    return result;
};

interface ClosestUpdatedLocationResult {
    location: ParsedOcpiLocationData;
    station: ParsedEvseData;
    last_updated: string;
}

const get_closest_updated_location = (locations: ParsedOcpiLocationData[]): ClosestUpdatedLocationResult => {
    const now = Timestamp.now();
    let closestDiff = Number.POSITIVE_INFINITY;
    let closestTimestamp = locations[0].stations[0].last_updated;
    let closestResult: ClosestUpdatedLocationResult = {
        location: locations[0],
        station: locations[0].stations[0],
        last_updated: moment(closestTimestamp.toDate()).format("YYYY-MM-DD HH:mm:ss"),
    };
    closestDiff = Math.abs(now.toMillis() - closestTimestamp.toMillis());

    locations.forEach((location) => {
        location.stations.forEach((station) => {
            const diff = Math.abs(now.toMillis() - station.last_updated.toMillis());
            if (diff < closestDiff) {
                closestDiff = diff;
                closestTimestamp = station.last_updated;
                closestResult = {
                    location,
                    station,
                    last_updated: moment(station.last_updated.toDate()).format("YYYY-MM-DD HH:mm:ss"),
                };
            }
        });
    });

    return closestResult;
};

export const test = async () => {
    const test_obg: ChargingState = {
        id: "1",
        lat: 31.99284503214462,
        lng: 34.767196453141935,
        car_number: "1234567890",
        status: "plugin",
    };
    const data = await get_locations_by_geo_and_status({
        lat: test_obg.lat,
        lng: test_obg.lng,
        // radius_in_meters: 1000 * 1,
        // status: "AVAILABLE",
    });

    const closest = get_closest_updated_location(data);
};
