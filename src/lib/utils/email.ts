import { response } from "express";
import { Resend } from "resend";
import { INTERNAL_SERVER_ERROR } from "../httpStatusCode.js";
import env from "./env.js";

const resend = new Resend(env.RESEND_API_KEY);

interface Params {
  to: string;
  subject: string;
  template: string;
  url: string;
}

export const sendAuthMail = async ({ to, subject, template, url }: Params) => {
  try {
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
