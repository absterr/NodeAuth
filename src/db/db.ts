import { Sequelize } from "sequelize";
import env from "../lib/utils/env.js";

const DB_URL = env.DATABASE_URL;

export const sequelize = new Sequelize(DB_URL, {
  dialect: "postgres",
  logging: false,
});

export const connectToDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB");
  } catch (error) {
    console.error("Could not connect to DB", error);
    process.exit(1);
  }
};
