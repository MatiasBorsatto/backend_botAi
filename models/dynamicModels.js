// models/dynamicModels.js
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/**
 * Mapeo simple de tipos "humanos" a Sequelize DataTypes
 */
const TYPE_MAP = {
  string: DataTypes.STRING,
  text: DataTypes.TEXT,
  integer: DataTypes.INTEGER,
  float: DataTypes.FLOAT,
  decimal: DataTypes.DECIMAL,
  boolean: DataTypes.BOOLEAN,
  date: DataTypes.DATE,
  uuid: DataTypes.UUID,
  json: DataTypes.JSONB, // útil en Postgres
};

/**
 * Valida y transforma la definición de campos entregada por la IA.
 * Espera un objeto:
 * {
 *   nombre: { type: "string", allowNull: false, unique: true, defaultValue: "", ... },
 *   saldo: { type: "decimal", allowNull: false }
 * }
 */
function buildAttributesFromSchema(fieldsDef) {
  const attrs = {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  };

  for (const [fieldName, spec] of Object.entries(fieldsDef || {})) {
    if (!spec?.type) throw new Error(`Campo "${fieldName}" sin 'type'.`);
    const lowerType = String(spec.type).toLowerCase();
    const dt = TYPE_MAP[lowerType];
    if (!dt)
      throw new Error(`Tipo no soportado: "${spec.type}" en "${fieldName}".`);

    const col = { type: dt };
    if (typeof spec.allowNull === "boolean") col.allowNull = spec.allowNull;
    if (typeof spec.unique === "boolean") col.unique = spec.unique;
    if (Object.prototype.hasOwnProperty.call(spec, "defaultValue"))
      col.defaultValue = spec.defaultValue;
    if (spec.validate && typeof spec.validate === "object")
      col.validate = spec.validate;

    attrs[fieldName] = col;
  }

  return attrs;
}

/**
 * Normaliza el nombre de la entidad a un nombre de modelo Sequelize válido.
 * - El modelo se registra en PascalCase singular.
 * - La tabla se define en snake_case plural por Sequelize automáticamente (si usas freezeTableName: false).
 */
function normalizeModelName(name) {
  if (!name) throw new Error("Nombre de entidad vacío.");
  const cleaned = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_");
  const pascal = cleaned
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return pascal || "Entidad";
}

/**
 * Registro en memoria de modelos dinámicos.
 */
const registry = new Map();

/**
 * Obtiene o crea un modelo dinámico.
 * @param {string} entityName - nombre lógico entregado por la IA (p.ej. "cliente")
 * @param {object} fieldsDef - definición de campos
 * @returns {Model} Sequelize Model
 */
export async function upsertDynamicModel(entityName, fieldsDef) {
  const modelName = normalizeModelName(entityName);

  // Si ya existe y no hay cambios, devuelve el existente
  if (registry.has(modelName)) {
    return registry.get(modelName);
  }

  // Construir atributos y definir modelo
  const attributes = buildAttributesFromSchema(fieldsDef);

  const Model = sequelize.define(modelName, attributes, {
    // Si querés que la tabla respete exactamente el nombre del modelo:
    // freezeTableName: true,
    // tableName: modelName,
    underscored: true, // columnas created_at / updated_at
  });

  // Sincroniza estructura (crea tabla si no existe). En Neon funciona bien.
  await Model.sync({ alter: true });

  registry.set(modelName, Model);
  return Model;
}

/**
 * Obtiene un modelo ya registrado. Devuelve null si no existe.
 */
export function getDynamicModel(entityName) {
  const modelName = normalizeModelName(entityName);
  return registry.get(modelName) || null;
}

/**
 * Crea (si no existe) un modelo mínimo con un solo campo 'data' JSONB
 * para usar como "catch-all" cuando no se envía schema, y sincroniza.
 */
export async function ensureLooseModel(entityName) {
  const modelName = normalizeModelName(entityName);
  if (registry.has(modelName)) return registry.get(modelName);

  const Model = sequelize.define(
    modelName,
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { underscored: true }
  );

  await Model.sync({ alter: true });
  registry.set(modelName, Model);
  return Model;
}

export default {
  upsertDynamicModel,
  getDynamicModel,
  ensureLooseModel,
};
