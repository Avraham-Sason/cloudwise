import { snapshot, snapshot_bulk_by_names } from "akeyless-server-commons/helpers";
import { handle_charging_state_add_and_edit } from "../sessions/helpers";
import { cache_manager } from "akeyless-server-commons/managers";

export * from "./parsers";

export const initialize_snapshot = async () => {
    await snapshot_bulk_by_names(["cloudwise-locations", "cloudwise-cdrs", "cloudwise-sessions"]);
    await snapshot({
        collection_name: "cloudwise-charging-state",
        on_first_time: (docs) => {
            cache_manager.setArrayData("cloudwise-charging-state", docs);
        },
        on_add: handle_charging_state_add_and_edit,
        on_modify: handle_charging_state_add_and_edit,
        on_remove: (docs) => {
            const prev = cache_manager.getArrayData("cloudwise-charging-state");
            const new_cars = prev.filter((car) => !docs.some((doc) => doc.id === car.id));
            cache_manager.setArrayData("cloudwise-charging-state", new_cars);
        },
    });
};

export const get_cdrs = (car_number: string, options?: { limit?: number; offset?: number }) => {
    const { limit = 100, offset = 0 } = options || {};
    const cdrs = cache_manager.getArrayData("cloudwise-cdrs");
    return cdrs.filter((cdr) => cdr.car_number === car_number).slice(offset, offset + limit);
};
