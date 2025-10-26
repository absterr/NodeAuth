import httpStatusCode from "./httpStatusCode.js";

export const enum AppErrorCode {
  InvalidAccessToken = "Invalid Access Token",
  InvalidRefreshToken = "Invalid Refresh Token",
}

class AppError extends Error {
  constructor(
    public statusCode: httpStatusCode,
    public message: string,
    public errorCode?: AppErrorCode
  ) {
    super(message);
  }
}

export default AppError;
