import { Sequelize } from "sequelize";
import env from "../utils/env.js";
import mysql from "mysql2/promise";

const DB_URL = env.DATABASE_URL;

export const sequelize = new Sequelize(DB_URL, {
  dialect: "mysql",
  logging: false,
});

const parsedURL = new URL(DB_URL);
const dbName = parsedURL.pathname.replace("/", "");

export const connectToDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: parsedURL.hostname,
      user: parsedURL.username,
      password: parsedURL.password,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    await sequelize.authenticate();
    console.log("Connected to DB");
  } catch (error) {
    console.error("Could not connect to DB", error);
    process.exit(1);
  }
};
