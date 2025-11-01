import { Router } from "express";
import { getUserDetailsHandler, logoutUserHandler } from "./main.controller.js";

const mainRoutes = Router();

mainRoutes.get("/", getUserDetailsHandler);
mainRoutes.post("/logout", logoutUserHandler);

export default mainRoutes;
