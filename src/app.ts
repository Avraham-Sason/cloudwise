import { logger } from "akeyless-server-commons/managers";
import { basic_init, get_version } from "akeyless-server-commons/helpers";
import { join } from "path";
import main_router from "./main_router";
import { initialize_snapshots } from "./helpers";
import { login } from "./cloudwise";

const init = async () => {
    const version = get_version(join(__dirname, "../package.json"));
    await basic_init(main_router, "nx-cloudwise", version);
    await initialize_snapshots();
    await login();
};
init().catch((e) => {
    logger.error(e);
    process.exit(1);
});
