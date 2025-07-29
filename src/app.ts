import { logger } from "akeyless-server-commons/managers";
import { basic_init } from "akeyless-server-commons/helpers";
import main_router from "./main_router";
import { initialize_snapshots } from "./helpers";
import { run_collect_cloudwise_locations, run_login } from "./cloudwise/tasks";
import package_json from "../package.json";

const init = async () => {
    const version = package_json.version;
    await basic_init(main_router, "nx-cloudwise", version);
    await initialize_snapshots();
    await run_login();
    await run_collect_cloudwise_locations();
};

init().catch((e) => {
    logger.error(e);
    process.exit(1);
});
