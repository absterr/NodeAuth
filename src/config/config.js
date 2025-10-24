require("dotenv").config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "mysql",
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: "mysql",
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: "mysql",
  },
};
