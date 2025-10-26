import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db.js";
import bcrypt from "bcrypt";
import env from "../../lib/utils/env.js";

export class Account extends Model<
  InferAttributes<Account>,
  InferCreationAttributes<Account>
> {
  declare id: CreationOptional<string>;
  declare accountId: CreationOptional<string | null>;
  declare providerId: string;
  declare userId: string;
  declare password: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  async validPassword(password: string): Promise<boolean | null> {
    if (!this.password) return null;
    return bcrypt.compare(password, this.password);
  }
}

Account.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    accountId: {
      type: DataTypes.STRING,
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Account",
    tableName: "accounts",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["providerId", "accountId"],
      },
    ],
    hooks: {
      async beforeCreate(account) {
        if (account.password) {
          const salt = await bcrypt.genSalt(env.SALT_ROUNDS);
          account.password = await bcrypt.hash(account.password, salt);
        }
      },

      async beforeUpdate(account) {
        if (account.password && account.changed("password")) {
          const salt = await bcrypt.genSalt(env.SALT_ROUNDS);
          account.password = await bcrypt.hash(account.password, salt);
        }
      },
    },
  }
);
