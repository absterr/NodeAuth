import { Account, User, Verification } from "../db/models/associations.js";
import { oneDayFromNow } from "../lib/date.js";
import { EMAIL_VERIFICATION_TEMPLATE } from "../lib/emailTemplates.js";
import { CONFLICT, CREATED } from "../lib/httpStatusCode.js";
import catchAsyncErrors from "../lib/utils/catchAsyncErrors.js";
import sendMail from "../lib/utils/sendMail.js";
import { signupSchema } from "./auth.schema.js";

export const signupHandler = catchAsyncErrors(async (req, res) => {
  const request = signupSchema.parse({
    ...req.body,
  });
  const { email, name, password } = request;
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(CONFLICT).json({
      success: false,
      message: "A user with this email already exists",
    });
  }

  const { id } = await User.create({ name, email });
  await Account.create({ providerId: "credential", userId: id, password });
  const { value } = await Verification.create({
    userId: id,
    type: "email_verification",
    expiresAt: oneDayFromNow(),
  });
  await sendMail({
    to: email,
    subject: "Email verification",
    template: EMAIL_VERIFICATION_TEMPLATE,
    value,
  });

  return res.status(CREATED).json({
    success: true,
    message: "Account created",
  });
});
