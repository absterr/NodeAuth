import { RequestHandler } from "express";
import { User } from "../db/models/user.model.js";
import { NOT_FOUND, UNAUTHORIZED } from "../lib/httpStatusCode.js";
import appAssert from "../lib/utils/appAssert.js";
import env from "../lib/utils/env.js";
import { AccessTokenPayload, verifyUserToken } from "../lib/utils/userToken.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;

const authHandler: RequestHandler = async (req, res, next) => {
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

  const user = await User.findByPk(payload.userId, {
    attributes: ["name", "email"],
  });
  appAssert(user, NOT_FOUND, "User not found");

  req.user = user;
  next();
};

export default authHandler;
