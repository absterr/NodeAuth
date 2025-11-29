import { User as SequelizeUser } from "./db/models/user.model.ts";

declare global {
  namespace Express {
    interface User extends SequelizeUser {}
  }
}

export {};
