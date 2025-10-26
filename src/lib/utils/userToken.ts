import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { Session } from "../../db/models/session.model.js";
import { User } from "../../db/models/user.model.js";

export type AccessTokenPayload = {
  userId: User["id"];
  sessionId: Session["id"];
};

export type RefreshTokenPayload = {
  sessionId: Session["id"];
};

export const signUserToken = ({
  payload,
  options,
  secret,
}: {
  payload: AccessTokenPayload | RefreshTokenPayload;
  options: SignOptions;
  secret: string;
}) => jwt.sign(payload, secret, { ...options, audience: ["user"] });

export const verifyUserToken = <T extends object>({
  token,
  options,
  secret,
}: {
  token: string;
  options?: VerifyOptions;
  secret: string;
}) => {
  const payload = jwt.verify(token, secret, {
    ...options,
    audience: ["user"],
  }) as T;

  return payload;
};
