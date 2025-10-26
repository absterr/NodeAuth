import bcrypt from "bcrypt";
import { sequelize } from "../db/db.js";
import {
  Account,
  Session,
  User,
  Verification,
} from "../db/models/associations.js";
import {
  fifteenMinsFromNow,
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
import { clearAuthCookies, setAuthCookies } from "../lib/utils/cookies.js";
import env from "../lib/utils/env.js";
import sendMail from "../lib/utils/sendMail.js";
import {
  AccessTokenPayload,
  signUserToken,
  verifyUserToken,
} from "../lib/utils/userToken.js";
import {
  emailSchema,
  loginSchema,
  signupSchema,
  verifyEmailSchema,
} from "./auth.schema.js";
import { Op } from "sequelize";

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;

export const signupHandler = catchAsyncErrors(async (req, res) => {
  const { email, name, password } = signupSchema.parse({
    ...req.body,
  });
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(CONFLICT).json({
      success: false,
      message: "A user with this email already exists",
    });
  }

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
    await sendMail({
      to: email,
      subject: "Email verification",
      template: EMAIL_VERIFICATION_TEMPLATE,
      value,
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
    where: { value: token },
  });
  if (!record) {
    return res.status(UNAUTHORIZED).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

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
      { where: { id }, transaction: t }
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

    setAuthCookies({ res, accessToken, refreshToken }).status(CREATED);
  });
});

export const credentialLoginHandler = catchAsyncErrors(async (req, res) => {
  const { email, password, userAgent } = loginSchema.parse({
    ...req.body,
  });
  const foundUser = await User.findOne({ where: { email } });
  if (!foundUser) {
    return res.status(NOT_FOUND).json({
      success: false,
      message: "User not found",
    });
  }
  const account = await Account.findOne({ where: { userId: foundUser.id } });
  if (!account || !account.password) {
    return res.status(BAD_REQUEST).json({
      success: false,
      message: "This user does not have a credential account",
    });
  }
  const isCorrect = await bcrypt.compare(password, account.password);
  if (!isCorrect) {
    return res.status(UNAUTHORIZED).json({
      success: false,
      message: "Invalid email or password",
    });
  }
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

  setAuthCookies({ res, accessToken, refreshToken }).status(CREATED);
});

export const forgotPasswordHandler = catchAsyncErrors(async (req, res) => {
  const { email } = emailSchema.parse({
    ...req.body,
  });
  const foundUser = await User.findOne({ where: { email } });
  if (!foundUser) {
    return res.status(NOT_FOUND).json({
      success: false,
      message: "User not found",
    });
  }
  const count = await Verification.count({
    where: {
      userId: foundUser.id,
      type: "password_reset",
      expiresAt: { [Op.lt]: tenMinsAgo() },
    },
  });
  if (count > 1) {
    return res.send(TOO_MANY_REQUEST).json({
      success: false,
      message: "Too many requests. Try again later",
    });
  }

  const { value } = await Verification.create({
    userId: foundUser.id,
    type: "password_reset",
    expiresAt: fifteenMinsFromNow(),
  });

  await sendMail({
    to: email,
    subject: "Password reset",
    template: PASSWORD_RESET_TEMPLATE,
    value,
  });

  return res.status(CREATED).json({
    success: true,
    message: "Password reset email sent.",
  });
});

export const logoutHandler = catchAsyncErrors(async (req, res) => {
  const accessToken = req.cookies.accessToken as string | undefined;
  if (!accessToken) {
    return res.status(UNAUTHORIZED).json({
      success: false,
      message: "Invalid token",
    });
  }

  const payload = verifyUserToken<AccessTokenPayload>({
    token: accessToken,
    secret: ACCESS_SECRET,
  });
  await Session.destroy({ where: { id: payload.sessionId } });
  clearAuthCookies(res).status(OK).json({
    success: true,
    message: "Logout successful",
  });
});
