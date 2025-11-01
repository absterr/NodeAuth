import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import authRoutes from "./auth/auth.route.js";
import { connectToDatabase } from "./db/db.js";
import { OK } from "./lib/httpStatusCode.js";
import env from "./lib/utils/env.js";
import mainRoutes from "./main/main.route.js";
import authHandler from "./middleware/authHandler.js";
import errorHander from "./middleware/errorHandler.js";

const app = express();
const PORT = env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: env.APP_ORIGIN,
    credentials: true,
  })
);

app.get("/test", (req: Request, res: Response) => {
  return res.status(OK).send("Hello world");
});

app.get("/session", authHandler, (req: Request, res: Response) => {
  return res.status(OK).json({
    success: true,
    message: "Valid session",
  });
});

app.use("/auth", authRoutes);

app.use(authHandler, mainRoutes);

app.use(errorHander);

app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Server is listening at port ${PORT}`);
});
