import express, { Request, Response } from "express";
import { connectToDatabase } from "./db/db.js";
import env from "./utils/env.js";

const app = express();
const PORT = env.PORT;

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Hello world");
});

app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Server is listening at port ${PORT}`);
});
