import { ErrorRequestHandler } from "express";
import { INTERNAL_SERVER_ERROR } from "../lib/httpStatusCode.js";

const errorHander: ErrorRequestHandler = (err, req, res, next) => {
  console.log(`PATH: ${req.path}`, err);
  return res.status(INTERNAL_SERVER_ERROR).send("Internal server error");
};

export default errorHander;
