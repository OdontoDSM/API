import { dbState } from "./dbState.js";
import { SqliteCollection } from "./sqliteModel.js";

// Cache de coleções SQLite para evitar recriação
const sqliteCollections = new Map();

function getSqliteCollection(collectionName) {
  if (!sqliteCollections.has(collectionName)) {
    sqliteCollections.set(
      collectionName,
      new SqliteCollection(dbState.sqlite, collectionName)
    );
  }
  return sqliteCollections.get(collectionName);
}

/**
 * Envolve um Mongoose Model em um Proxy que delega para SQLite
 * quando dbState.type === 'sqlite', sem alterar os controllers.
 *
 * @param {object} mongooseModel - resultado de mongoose.model(...)
 * @param {string} collectionName - nome da coleção SQLite (ex: 'patients')
 */
export function adaptModel(mongooseModel, collectionName) {
  return new Proxy(mongooseModel, {
    get(target, prop) {
      if (dbState.type === "sqlite") {
        const coll = getSqliteCollection(collectionName);
        const val = coll[prop];
        if (typeof val === "function") return val.bind(coll);
        if (val !== undefined) return val;
        // Propriedade não implementada no SQLite: retorna undefined
        return undefined;
      }

      // MongoDB (Atlas ou local): usa o modelo Mongoose normal
      const val = target[prop];
      if (typeof val === "function") return val.bind(target);
      return val;
    },

    // Permite `instanceof` checks no Proxy
    getPrototypeOf(target) {
      return Object.getPrototypeOf(target);
    },
  });
}
