import { join } from "path";
import express, { Router } from "express";
import { get_version } from "akeyless-server-commons/helpers";
import { MainRouter } from "akeyless-server-commons/types";
import { verify_user_auth } from "akeyless-server-commons/middlewares";
import cloudwise_router from "./cloudwise/router";
const root_router: Router = express.Router();
const app_router: Router = express.Router();

root_router.get("/", (req, res) => res.status(200).send("OK from cloudwise root"));
root_router.use("/api/cloudwise", app_router);

app_router.get("/", (req, res) => {
    res.send(process.env.mode === "qa" ? "hello from cloudwise QA" : "hello from cloudwise PROD");
});
app_router.get("/v", (req, res) => {
    res.send(`${get_version(join(__dirname, "../package.json"))} --${process.env.mode === "qa" ? "QA" : "PROD"}`);
});

app_router.use("/go", verify_user_auth, cloudwise_router);

const main_router: MainRouter = (app) => {
    app.use(root_router);
};

export default main_router;
