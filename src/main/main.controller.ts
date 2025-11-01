import { Session } from "../db/models/session.model.js";
import { User } from "../db/models/user.model.js";
import { NOT_FOUND, OK, UNAUTHORIZED } from "../lib/httpStatusCode.js";
import appAssert from "../lib/utils/appAssert.js";
import catchAsyncErrors from "../lib/utils/catchAsyncErrors.js";
import { clearAuthCookies } from "../lib/utils/cookies.js";
import env from "../lib/utils/env.js";
import { AccessTokenPayload, verifyUserToken } from "../lib/utils/userToken.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;

export const getUserDetailsHandler = catchAsyncErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, UNAUTHORIZED, "Invalid token");

  const user = await User.findByPk(userId, {
    attributes: ["name", "email"],
  });
  appAssert(user, NOT_FOUND, "User not found");

  return res.status(OK).json({
    success: true,
    user,
  });
});

export const logoutUserHandler = catchAsyncErrors(async (req, res) => {
  const accessToken = req.cookies.accessToken as string | undefined;
  appAssert(accessToken, UNAUTHORIZED, "Invalid access token");

  const { payload } = verifyUserToken<AccessTokenPayload>({
    token: accessToken,
    secret: ACCESS_SECRET,
  });
  appAssert(payload, UNAUTHORIZED, "Invalid access token");

  await Session.destroy({ where: { id: payload.sessionId } });
  clearAuthCookies(res).status(OK).json({
    success: true,
    message: "Logout successful",
  });
});
