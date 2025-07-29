import { snapshot_bulk_by_names } from "akeyless-server-commons/helpers";

export const initialize_snapshots = async () => {
    await snapshot_bulk_by_names(["cloudwise-charging-state", "cloudwise-locations"]);
};
