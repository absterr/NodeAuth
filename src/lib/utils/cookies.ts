import { CookieOptions, Response } from "express";
import env from "./env.js";
import { fifteenMinsFromNow, twoWeeksFromNow } from "../date.js";

const REFRESH_PATH = "/auth/refresh";
const secure = env.NODE_ENV === "production";
const defaults: CookieOptions = {
  sameSite: "strict",
  httpOnly: true,
  secure,
};

export const setAuthCookies = ({
  res,
  accessToken,
  refreshToken,
}: {
  res: Response;
  accessToken: string;
  refreshToken: string;
}) => {
  return res
    .cookie("accessToken", accessToken, {
      ...defaults,
      expires: fifteenMinsFromNow(),
    })
    .cookie("refreshToken", refreshToken, {
      ...defaults,
      path: REFRESH_PATH,
      expires: twoWeeksFromNow(),
    });
};

export const refreshAuthCookies = ({
  res,
  newAccessToken,
  newRefreshToken,
}: {
  res: Response;
  newAccessToken: string;
  newRefreshToken: string | undefined;
}) => {
  if (newRefreshToken) {
    return res
      .cookie("accessToken", newAccessToken, {
        ...defaults,
        expires: fifteenMinsFromNow(),
      })
      .cookie("refreshToken", newRefreshToken, {
        ...defaults,
        path: REFRESH_PATH,
        expires: twoWeeksFromNow(),
      });
  }

  return res.cookie("accessToken", newAccessToken, {
    ...defaults,
    expires: fifteenMinsFromNow(),
  });
};
