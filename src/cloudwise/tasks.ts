import { db, execute_task, TaskName } from "akeyless-server-commons/helpers";
import { get_locations, login } from "./helpers";
import { OcpiConnector, OcpiEvse, OcpiLocation, ParsedConnectorData, ParsedEvseData, ParsedLocationData } from "./types";
import { Timestamp } from "firebase-admin/firestore";
import { cache_manager, logger } from "akeyless-server-commons/managers";
import { isEqual } from "lodash";

export const run_collect_cloudwise_locations = () => {
    setInterval(() => {
        execute_task("cloudwise", TaskName.collect_cloudwise_locations, task__collect_cloudwise_locations);
    }, 30 * 60 * 1000);
};
export const run_login = () => {
    setInterval(login, 60 * 60 * 1000);
};

export const task__collect_cloudwise_locations = async () => {
    const locations = await get_locations({ limit: 15 });
    const parsed_data = locations.map(parse_location);
    const cached_location: ParsedLocationData[] = cache_manager.getArrayData("cloudwise-locations");
    const need_to_update: ParsedLocationData[] = [];

    for (const loc of parsed_data) {
        const cached = cached_location.find((l) => l.id === loc.id);
        if (!cached || !isEqual(cached, loc)) {
            need_to_update.push(loc);
        }
    }

    if (need_to_update.length) {
        const batch = db.batch();
        need_to_update.forEach((loc) => {
            batch.set(db.collection("cloudwise-locations").doc(loc.id), loc);
        });
        await batch.commit();
        logger.log(`Updated ${need_to_update.length} locations`);
    }
};

const parse_location = (location: OcpiLocation): ParsedLocationData => {
    const {
        Name: name,
        Images: image,
        Id: id,
        Country: country,
        Address: address,
        OcpiEvses: ocpi_evses,
        CompanyName: company_name,
        PartyId: party_id,
        Latitude: lat,
        Longitude: lng,
    } = location;

    const ocpi_evses_data = ocpi_evses.map(parse_eves);
    const res: ParsedLocationData = {
        name,
        id,
        country,
        address,
        company_name,
        party_id,
        lat,
        lng,
        stations: ocpi_evses_data,
    };
    if (image) {
        res.image = image;
    }

    return res;
};

const parse_eves = (evse: OcpiEvse): ParsedEvseData => {
    const {
        Uid: uid,
        Status: status,
        FloorLevel: floor_level,
        PhysicalReference: physical_reference,
        LastUpdated: last_updated,
        OcpiConnectors: connectors,
    } = evse;
    const connectors_data = connectors.map(parse_connectors);
    return {
        uid,
        status,
        floor_level,
        physical_reference,
        last_updated: Timestamp.fromDate(new Date(last_updated)),
        connectors: connectors_data,
    };
};

const parse_connectors = (connector: OcpiConnector): ParsedConnectorData => {
    const {
        Id: connector_id,
        Standard: standard,
        Format: format,
        PowerType: power_type,
        MaxVoltage: max_voltage,
        MaxAmperage: max_amperage,
        MaxElectricPower: max_electric_power,
        LastUpdated: last_updated,
        TariffId: tariff_id,
    } = connector;
    return {
        id: connector_id,
        standard,
        format,
        power_type,
        max_voltage,
        max_amperage,
        max_electric_power,
        last_updated: Timestamp.fromDate(new Date(last_updated)),
        tariff_id,
    };
};
