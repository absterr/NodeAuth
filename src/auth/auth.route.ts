import { Router } from "express";
import {
  credentialLoginHandler,
  logoutHandler,
  signupHandler,
  verifyEmailHandler,
} from "./auth.controller.js";

const authRoutes = Router();

authRoutes.post("/signup", signupHandler);
authRoutes.post("/email/verify", verifyEmailHandler);
authRoutes.post("/login", credentialLoginHandler);
authRoutes.get("/logout", logoutHandler);

export default authRoutes;
