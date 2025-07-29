import express, { Router } from "express";
import { MainRouter } from "akeyless-server-commons/types";
import { cloudwise_router } from "./cloudwise";
const root_router: Router = express.Router();

root_router.get("/", (req, res) => res.status(200).send("OK from cloudwise root"));
root_router.use("/api/cloudwise", cloudwise_router);

const main_router: MainRouter = (app) => {
    app.use(root_router);
};

export default main_router;
