import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../db.js";
import { randomBytes } from "crypto";

type VerificationType =
  | "email_change"
  | "email_verification"
  | "password_reset";

export class Verification extends Model<
  InferAttributes<Verification>,
  InferCreationAttributes<Verification>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare type: VerificationType;
  declare value: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare expiresAt: Date;
}

Verification.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "email_change",
        "email_verification",
        "password_reset"
      ),
      allowNull: false,
    },
    value: {
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
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Verification",
    tableName: "verifications",
    timestamps: true,
    hooks: {
      beforeCreate: (verification) => {
        if (!verification.value)
          verification.value = randomBytes(20).toString("hex");
      },
    },
  }
);
