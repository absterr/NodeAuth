import { sequelize } from "./db.js";

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Database schema synced successfully.");
  } catch (error) {
    console.error("Failed to sync database schema: ", error);
  } finally {
    await sequelize.close();
  }
})();
