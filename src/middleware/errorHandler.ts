import { ErrorRequestHandler, Response } from "express";
import z from "zod";
import AppError from "../lib/AppError.js";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from "../lib/httpStatusCode.js";
import { clearAuthCookies } from "../lib/utils/cookies.js";

const REFRESH_PATH = "/auth/refresh";

const handleZodError = (res: Response, error: z.ZodError) => {
  res.status(BAD_REQUEST).json({
    success: false,
    message: error.message,
  });
};

const handleAppError = (res: Response, error: AppError) => {
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};

const errorHander: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`PATH: ${req.path}`, err);

  if (req.path === REFRESH_PATH) clearAuthCookies(res);
  if (err instanceof z.ZodError) handleZodError(res, err);
  if (err instanceof AppError) handleAppError(res, err);

  res.status(INTERNAL_SERVER_ERROR).send("Internal server error");
};

export default errorHander;
