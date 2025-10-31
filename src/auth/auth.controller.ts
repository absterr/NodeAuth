import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { sequelize } from "../db/db.js";
import {
  Account,
  Session,
  User,
  Verification,
} from "../db/models/associations.js";
import {
  fifteenMinsFromNow,
  oneDay,
  oneDayFromNow,
  tenMinsAgo,
  twoWeeksFromNow,
} from "../lib/date.js";
import {
  EMAIL_VERIFICATION_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
} from "../lib/emailTemplates.js";
import {
  BAD_REQUEST,
  CONFLICT,
  CREATED,
  NOT_FOUND,
  OK,
  TOO_MANY_REQUEST,
  UNAUTHORIZED,
} from "../lib/httpStatusCode.js";
import catchAsyncErrors from "../lib/utils/catchAsyncErrors.js";
import {
  clearAuthCookies,
  refreshAuthCookies,
  setAuthCookies,
} from "../lib/utils/cookies.js";
import env from "../lib/utils/env.js";
import { sendAuthMail } from "../lib/utils/email.js";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  signUserToken,
  verifyUserToken,
} from "../lib/utils/userToken.js";
import {
  emailSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  tokenSchema,
  verifyEmailSchema,
} from "./auth.schema.js";
import appAssert from "../lib/utils/appAssert.js";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const signupHandler = catchAsyncErrors(async (req, res) => {
  const { email, name, password } = signupSchema.parse(req.body);
  const existingUser = await User.findOne({ where: { email } });
  appAssert(!existingUser, CONFLICT, "A user with this email already exists");

  await sequelize.transaction(async (t) => {
    const { id } = await User.create({ name, email }, { transaction: t });
    await Account.create(
      { providerId: "credential", userId: id, password },
      { transaction: t }
    );
    const { value } = await Verification.create(
      {
        userId: id,
        type: "email_verification",
        expiresAt: oneDayFromNow(),
      },
      { transaction: t }
    );
    const url = `${process.env.APP_ORIGIN}/verify-email?token=${value}`;
    await sendAuthMail({
      to: email,
      subject: "Email verification",
      template: EMAIL_VERIFICATION_TEMPLATE,
      url,
    });
  });

  return res.status(CREATED).json({
    success: true,
    message: "Account created. Verification email sent",
  });
});

export const verifyEmailHandler = catchAsyncErrors(async (req, res) => {
  const { token, userAgent } = verifyEmailSchema.parse({
    token: req.query.token,
    userAgent: req.headers["user-agent"],
  });

  const record = await Verification.findOne({
    where: { value: token, expiresAt: { [Op.gt]: new Date() } },
  });
  appAssert(record, UNAUTHORIZED, "Invalid or expired token");

  await sequelize.transaction(async (t) => {
    const { id, userId } = await Session.create(
      {
        userId: record.userId,
        userAgent,
        expiresAt: twoWeeksFromNow(),
      },
      { transaction: t }
    );
    await User.update(
      { emailVerified: true },
      { where: { id: userId }, transaction: t }
    );

    await record.destroy({ transaction: t });

    const accessToken = signUserToken({
      payload: { userId: userId, sessionId: id },
      options: { expiresIn: "15m" },
      secret: ACCESS_SECRET,
    });
    const refreshToken = signUserToken({
      payload: { sessionId: id },
      options: { expiresIn: "14d" },
      secret: REFRESH_SECRET,
    });

    setAuthCookies({ res, accessToken, refreshToken }).status(CREATED).json({
      success: true,
      message: "Email verified",
    });
  });
});

export const credentialLoginHandler = catchAsyncErrors(async (req, res) => {
  const { email, password, userAgent } = loginSchema.parse({
    ...req.body,
    userAgent: req.headers["user-agent"],
  });
  const foundUser = await User.findOne({ where: { email } });
  appAssert(foundUser, NOT_FOUND, "User not found");

  const account = await Account.findOne({ where: { userId: foundUser.id } });
  appAssert(
    account && account.password,
    BAD_REQUEST,
    "This user does not have a credential account"
  );

  const isCorrect = await bcrypt.compare(password, account.password);
  appAssert(isCorrect, UNAUTHORIZED, "Invalid email or password");

  const { id, userId } = await Session.create({
    userId: account.userId,
    userAgent,
    expiresAt: twoWeeksFromNow(),
  });
  const accessToken = signUserToken({
    payload: { userId: userId, sessionId: id },
    options: { expiresIn: "15m" },
    secret: ACCESS_SECRET,
  });
  const refreshToken = signUserToken({
    payload: { sessionId: id },
    options: { expiresIn: "14d" },
    secret: REFRESH_SECRET,
  });

  setAuthCookies({ res, accessToken, refreshToken }).status(CREATED).json({
    success: true,
    message: "Login successful",
  });
});

export const forgotPasswordHandler = catchAsyncErrors(async (req, res) => {
  const { email } = emailSchema.parse(req.body);
  const foundUser = await User.findOne({ where: { email } });
  appAssert(foundUser, NOT_FOUND, "User not found");

  const count = await Verification.count({
    where: {
      userId: foundUser.id,
      type: "password_reset",
      expiresAt: { [Op.lt]: tenMinsAgo() },
    },
  });
  appAssert(count <= 1, TOO_MANY_REQUEST, "Too many requests. Try again later");

  const { value } = await Verification.create({
    userId: foundUser.id,
    type: "password_reset",
    expiresAt: fifteenMinsFromNow(),
  });
  const url = `${process.env.APP_ORIGIN}/password-reset?token=${value}`;
  await sendAuthMail({
    to: email,
    subject: "Password reset",
    template: PASSWORD_RESET_TEMPLATE,
    url,
  });

  return res.status(CREATED).json({
    success: true,
    message: "Password reset email sent.",
  });
});

export const resetPasswordTokenHandler = catchAsyncErrors(async (req, res) => {
  const { token } = await tokenSchema.parse({
    token: req.query.token,
  });

  const validToken = await Verification.findOne({
    where: { value: token, expiresAt: { [Op.gt]: new Date() } },
  });
  appAssert(validToken, UNAUTHORIZED, "Invalid or expired token.");

  return res.status(OK).json({
    success: true,
    message: "Password change verified",
  });
});

export const resetPasswordHandler = catchAsyncErrors(async (req, res) => {
  const { password, token } = await resetPasswordSchema.parse({
    ...req.body,
    token: req.query.token,
  });

  const validToken = await Verification.findOne({
    where: { value: token, expiresAt: { [Op.gt]: new Date() } },
  });
  appAssert(validToken, UNAUTHORIZED, "Invalid or expired token.");

  await sequelize.transaction(async (t) => {
    await Account.update(
      { password },
      { where: { userId: validToken.userId }, transaction: t }
    );
    await Session.destroy({
      where: { userId: validToken.userId },
      transaction: t,
    });
    await validToken.destroy({ transaction: t });
  });
  clearAuthCookies(res).status(OK).json({
    success: true,
    message: "Password reset successful",
  });
});

export const refreshTokenHandler = catchAsyncErrors(async (req, res) => {
  const userRefreshToken = req.cookies.refreshToken as string | undefined;
  appAssert(userRefreshToken, UNAUTHORIZED, "Invalid refresh token");

  const { payload } = verifyUserToken<RefreshTokenPayload>({
    token: userRefreshToken,
    secret: REFRESH_SECRET,
  });
  appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

  const validSession = await Session.findOne({
    where: { id: payload.sessionId, expiresAt: { [Op.gt]: new Date() } },
  });
  appAssert(validSession, UNAUTHORIZED, "Session expired");

  const now = Date.now();
  const willExpireSoon = validSession.expiresAt.getTime() - now <= oneDay;
  if (willExpireSoon) {
    validSession.expiresAt = twoWeeksFromNow();
    await validSession.save();
  }

  const newRefreshToken = willExpireSoon
    ? signUserToken({
        payload: { sessionId: validSession.id },
        options: { expiresIn: "14d" },
        secret: REFRESH_SECRET,
      })
    : undefined;

  const newAccessToken = signUserToken({
    payload: { userId: validSession.userId, sessionId: validSession.id },
    options: { expiresIn: "15m" },
    secret: ACCESS_SECRET,
  });

  refreshAuthCookies({ res, newRefreshToken, newAccessToken }).status(OK).json({
    message: "Refreshed token",
  });
});

export const logoutHandler = catchAsyncErrors(async (req, res) => {
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
