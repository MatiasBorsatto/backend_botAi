import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const models = {};

export async function upsertDynamicModel(entity, schema) {
  if (!schema || typeof schema !== "object") throw new Error("Schema inválido");

  if (models[entity]) return models[entity]; // ya existe

  const attributes = {};
  for (const [key, type] of Object.entries(schema)) {
    switch (type.toLowerCase()) {
      case "string":
        attributes[key] = { type: DataTypes.STRING };
        break;
      case "text":
        attributes[key] = { type: DataTypes.TEXT };
        break;
      case "integer":
        attributes[key] = { type: DataTypes.INTEGER };
        break;
      case "float":
        attributes[key] = { type: DataTypes.FLOAT };
        break;
      case "decimal":
        attributes[key] = { type: DataTypes.DECIMAL };
        break;
      case "boolean":
        attributes[key] = { type: DataTypes.BOOLEAN };
        break;
      case "date":
        attributes[key] = { type: DataTypes.DATE };
        break;
      case "uuid":
        attributes[key] = {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        };
        break;
      case "json":
        attributes[key] = { type: DataTypes.JSONB };
        break;
      default:
        attributes[key] = { type: DataTypes.STRING }; // fallback
    }
  }

  const Model = sequelize.define(entity, attributes, {
    schema: "aurai",
    timestamps: true,
  });
  await Model.sync(); // crea la tabla si no existe
  models[entity] = Model;
  return Model;
}

export function getDynamicModel(entity) {
  return models[entity];
}

export async function ensureLooseModel(entity) {
  // fallback a JSONB flexible
  if (models[entity]) return models[entity];
  const Model = sequelize.define(
    entity,
    { data: { type: DataTypes.JSONB } },
    { schema: "aurai", timestamps: true }
  );
  await Model.sync();
  models[entity] = Model;
  return Model;
}
