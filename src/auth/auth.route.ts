import { Router } from "express";
import passport from "passport";
import {
  credentialLoginHandler,
  credentialSignupHandler,
  forgotPasswordHandler,
  googleSigninHandler,
  refreshTokenHandler,
  resetPasswordHandler,
  resetPasswordTokenHandler,
  verifyEmailHandler,
} from "./auth.controller.js";
import env from "../lib/utils/env.js";

const authRoutes = Router();

authRoutes.post("/signup", credentialSignupHandler);
authRoutes.post("/email/verify", verifyEmailHandler);
authRoutes.post("/login", credentialLoginHandler);
authRoutes.post("/password/forgot", forgotPasswordHandler);
authRoutes.get("/password/reset", resetPasswordTokenHandler);
authRoutes.post("/password/reset", resetPasswordHandler);
authRoutes.post("/refresh", refreshTokenHandler);

// GOOGLE OAUTH
authRoutes.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
authRoutes.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.APP_ORIGIN}/login`
  }),
  googleSigninHandler
);


export default authRoutes;
