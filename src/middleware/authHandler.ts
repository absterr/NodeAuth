import { RequestHandler } from "express";
import { UNAUTHORIZED } from "../lib/httpStatusCode.js";
import appAssert from "../lib/utils/appAssert.js";
import env from "../lib/utils/env.js";
import { AccessTokenPayload, verifyUserToken } from "../lib/utils/userToken.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;

const authHandler: RequestHandler = (req, res, next) => {
  const accessToken = req.cookies.accessToken as string | undefined;
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
