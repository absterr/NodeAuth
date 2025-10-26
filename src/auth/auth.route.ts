import { Router } from "express";
import { signupHandler } from "./auth.controller.js";

const authRoutes = Router();

authRoutes.post("/signup", signupHandler);

export default authRoutes;
