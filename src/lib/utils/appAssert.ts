import assert from "assert";
import AppError, { AppErrorCode } from "../AppError.js";
import httpStatusCode from "../httpStatusCode.js";

type AppAssert = (
  condition: any,
  httpStatusCode: httpStatusCode,
  message: string,
  appErrorCode?: AppErrorCode
) => asserts condition;

const appAssert: AppAssert = (condition, statusCode, message, errorCode) =>
  assert(condition, new AppError(statusCode, message, errorCode));

export default appAssert;
