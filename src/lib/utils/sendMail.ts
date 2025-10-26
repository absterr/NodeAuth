import { Resend } from "resend";
import { response } from "express";
import env from "./env.js";
import { INTERNAL_SERVER_ERROR } from "../httpStatusCode.js";

const resend = new Resend(env.RESEND_API_KEY);

interface Params {
  to: string;
  subject: string;
  template: string;
  value: string;
}

const sendMail = async ({ to, subject, template, value }: Params) => {
  try {
    const url = `${process.env.APP_ORIGIN}/auth/verify-email?token=${value}`;
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: to.toLowerCase().trim(),
      subject: subject.trim(),
      html: template.replace("{URL}", url),
    });
    if (error) {
      return response.status(INTERNAL_SERVER_ERROR).json({
        message: `Failed to send email, ${error.message}`,
      });
    }

    return data;
  } catch (error) {
    return response.status(INTERNAL_SERVER_ERROR).json({
      message: `Error sending email: ${error}`,
    });
  }
};

export default sendMail;
