import { db, execute_task, TaskName } from "akeyless-server-commons/helpers";
import { parse_ocpi_location } from "./helpers";
import { ParsedOcpiLocationData } from "./types";
import { cache_manager, logger } from "akeyless-server-commons/managers";
import { isEqual } from "lodash";
import { get_locations, login } from "./api/helpers";

export const run_collect_cloudwise_locations = async () => {
    await execute_task("cloudwise", TaskName.collect_cloudwise_locations, task__collect_cloudwise_locations);
    setInterval(() => {
        execute_task("cloudwise", TaskName.collect_cloudwise_locations, task__collect_cloudwise_locations);
    }, 30 * 60 * 1000);
};
export const run_login = async () => {
    await login();
    setInterval(login, 2 * 60 * 60 * 1000);
};

export const task__collect_cloudwise_locations = async () => {
    const locations = await get_locations();
    const parsed_data = locations.map(parse_ocpi_location);
    const cached_location: ParsedOcpiLocationData[] = cache_manager.getArrayData("cloudwise-locations");
    const need_to_update: ParsedOcpiLocationData[] = [];

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
