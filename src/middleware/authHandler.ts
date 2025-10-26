import { RequestHandler } from "express";
import appAssert from "../lib/utils/appAssert.js";
import { UNAUTHORIZED } from "../lib/httpStatusCode.js";
import { AccessTokenPayload, verifyUserToken } from "../lib/utils/userToken.js";
import env from "../lib/utils/env.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;

const authHandler: RequestHandler = (req, res, next) => {
  const accessToken = req.cookies.access as string | undefined;
  appAssert(accessToken, UNAUTHORIZED, "Invalid access token");

  const { error, payload } = verifyUserToken<AccessTokenPayload>({
    token: accessToken,
    secret: ACCESS_SECRET,
  });
  appAssert(
    payload,
    UNAUTHORIZED,
    error === "jwt expired" ? "Session expired" : "Invalid token"
  );

  req.userId = payload.userId;
  next();
};

export default authHandler;
