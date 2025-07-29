import { snapshot, snapshot_bulk_by_names } from "akeyless-server-commons/helpers";
import { parse_charging_add_edit } from "./sessions";

export * from "./parsers";
export * from "./sessions";

export const initialize_snapshot = async () => {
    await snapshot_bulk_by_names(["cloudwise-locations"]);
    await snapshot({
        collection_name: "cloudwise-charging-state",
        on_add: parse_charging_add_edit,
        on_modify: parse_charging_add_edit,
    });
};
