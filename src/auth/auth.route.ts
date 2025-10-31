import { Router } from "express";
import {
  credentialLoginHandler,
  forgotPasswordHandler,
  logoutHandler,
  refreshTokenHandler,
  resetPasswordHandler,
  resetPasswordTokenHandler,
  signupHandler,
  verifyEmailHandler,
} from "./auth.controller.js";

const authRoutes = Router();

authRoutes.post("/signup", signupHandler);
authRoutes.post("/email/verify", verifyEmailHandler);
authRoutes.post("/login", credentialLoginHandler);
authRoutes.post("/password/forgot", forgotPasswordHandler);
authRoutes.get("/password/reset", resetPasswordTokenHandler);
authRoutes.post("/password/reset", resetPasswordHandler);
authRoutes.post("/refresh", refreshTokenHandler);
authRoutes.get("/logout", logoutHandler);

export default authRoutes;
