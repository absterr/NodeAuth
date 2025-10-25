import { User } from "./user.model.js";
import { Account } from "./account.model.js";
import { Session } from "./session.model.js";
import { Verification } from "./verification.model.js";

Account.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Account, { foreignKey: "userId" });

Session.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Session, { foreignKey: "userId" });

Verification.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Verification, { foreignKey: "userId" });

export { User, Account, Session, Verification };
