import { sequelize } from "../db/db.js";
import { Account, User, Verification } from "../db/models/associations.js";
import { oneDayFromNow } from "../lib/date.js";
import { EMAIL_VERIFICATION_TEMPLATE } from "../lib/emailTemplates.js";
import { CONFLICT, CREATED, UNAUTHORIZED } from "../lib/httpStatusCode.js";
import catchAsyncErrors from "../lib/utils/catchAsyncErrors.js";
import sendMail from "../lib/utils/sendMail.js";
import { signupSchema, verifyEmailSchema } from "./auth.schema.js";

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

  const record = await Verification.findOne({ where: { value: token } });
  if (!record) {
    return res.status(UNAUTHORIZED).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
});
