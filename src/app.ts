import { logger } from "akeyless-server-commons/managers";
import { basic_init } from "akeyless-server-commons/helpers";
import main_router from "./main_router";
import { run_tasks } from "./cloudwise/tasks";
import package_json from "../package.json";
import { initialize_snapshot } from "./cloudwise/helpers";
import { login } from "./cloudwise/api/helpers";

const init = async () => {
    const version = package_json.version;
    await basic_init(main_router, "nx-cloudwise", version);
    await login();
    await initialize_snapshot();
    await run_tasks();
};

init().catch((e) => {
    logger.error(e);
    process.exit(1);
});
