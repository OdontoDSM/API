import crypto from "crypto";
import { dbState } from "./dbState.js";

// ─── Registro de coleções (usado pelo populate) ─────────────────────────────
const collectionRegistry = new Map();

function registerCollection(name, instance) {
  collectionRegistry.set(name, instance);
}

function getCollectionByName(name) {
  return collectionRegistry.get(name);
}

// Mapeia nome de campo (referência) para nome de coleção
const FIELD_TO_COLLECTION = {
  patient: "patients",
  user: "users",
  treatment: "treatments",
  budget: "budgets",
  payment: "payments",
  medicalRecord: "medicalrecords",
  file: "files",
  appointment: "appointments",
};

function resolveCollection(fieldPath) {
  return FIELD_TO_COLLECTION[fieldPath] ?? fieldPath + "s";
}

// ─── Geração de ID compatível com ObjectId (24 hex chars) ───────────────────
function generateId() {
  return crypto.randomBytes(12).toString("hex");
}

// ─── Comparação de valores (suporta Dates e strings) ─────────────────────────
function compareValues(a, b) {
  if (a === b) return true;
  // Se algum dos lados parece uma data
  if (b instanceof Date) {
    const da = new Date(a);
    return !isNaN(da) && da.getTime() === b.getTime();
  }
  if (a instanceof Date) {
    const db_ = new Date(b);
    return !isNaN(db_) && a.getTime() === db_.getTime();
  }
  return String(a) === String(b);
}

function toComparable(v) {
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  if (!isNaN(d)) return d.getTime();
  return v;
}

// ─── Avaliação de filtros estilo Mongoose ────────────────────────────────────
function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  return Object.entries(filter).every(([key, value]) => {
    const docVal = doc[key];

    if (value === null || value === undefined) {
      return docVal == null;
    }

    if (typeof value !== "object" || value instanceof Date) {
      return compareValues(docVal, value);
    }

    // Operadores MongoDB
    if ("$ne" in value) return !compareValues(docVal, value.$ne);
    if ("$in" in value) return value.$in.some((v) => compareValues(docVal, v));
    if ("$nin" in value) return !value.$nin.some((v) => compareValues(docVal, v));

    if ("$gte" in value || "$lte" in value || "$gt" in value || "$lt" in value) {
      const dv = toComparable(docVal);
      if ("$gte" in value && dv < toComparable(value.$gte)) return false;
      if ("$lte" in value && dv > toComparable(value.$lte)) return false;
      if ("$gt" in value && dv <= toComparable(value.$gt)) return false;
      if ("$lt" in value && dv >= toComparable(value.$lt)) return false;
      return true;
    }

    // Sub-objeto: comparação profunda simples
    return JSON.stringify(docVal) === JSON.stringify(value);
  });
}

// ─── Seleção de campos (select) ───────────────────────────────────────────────
function applySelect(doc, select) {
  if (!select) return doc;
  const fields =
    typeof select === "string"
      ? select.split(" ").filter(Boolean)
      : Object.keys(select);
  const result = { _id: doc._id };
  for (const f of fields) {
    if (f !== "_id" && doc[f] !== undefined) result[f] = doc[f];
  }
  return result;
}

// ─── Populate manual (busca referências em outras coleções) ──────────────────
async function populateDoc(rawData, spec) {
  if (!rawData || !spec) return rawData;
  const specs = Array.isArray(spec) ? spec : [spec];
  const result = { ...rawData };

  for (const s of specs) {
    const { path: fieldPath, select } = typeof s === "string" ? { path: s, select: null } : s;
    const refId = result[fieldPath];
    if (!refId) continue;

    const collName = resolveCollection(fieldPath);
    const coll = getCollectionByName(collName);
    if (!coll) continue;

    const refDoc = coll._findByIdRaw(String(refId));
    if (refDoc) {
      result[fieldPath] = select ? applySelect(refDoc, select) : refDoc;
    }
  }

  return makeDocument(result, null);
}

// ─── Criação de documento (objeto com métodos não-enumeráveis) ───────────────
function makeDocument(rawData, collection) {
  const doc = { ...rawData };

  Object.defineProperties(doc, {
    toObject: {
      enumerable: false,
      value: () => ({ ...rawData }),
    },
    toJSON: {
      enumerable: false,
      value: () => ({ ...rawData }),
    },
    populate: {
      enumerable: false,
      value: (spec) => populateDoc({ ...rawData }, spec),
    },
    save: {
      enumerable: false,
      value: async () => {
        if (collection) collection._updateByIdRaw(rawData._id, rawData);
        return doc;
      },
    },
  });

  return doc;
}

// ─── Query builder (suporta encadeamento: .sort().populate().select()) ───────
class SqliteQuery {
  constructor(collection, type, filter) {
    this._collection = collection;
    this._type = type; // 'find' | 'findOne'
    this._filter = filter;
    this._sortSpec = null;
    this._selectSpec = null;
    this._populateSpecs = [];
  }

  sort(spec) {
    this._sortSpec = spec;
    return this;
  }

  select(spec) {
    this._selectSpec = spec;
    return this;
  }

  lean() {
    return this;
  }

  populate(pathOrSpec, selectStr) {
    if (typeof pathOrSpec === "string") {
      this._populateSpecs.push({ path: pathOrSpec, select: selectStr ?? null });
    } else if (Array.isArray(pathOrSpec)) {
      this._populateSpecs.push(...pathOrSpec);
    } else {
      this._populateSpecs.push(pathOrSpec);
    }
    return this;
  }

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }

  catch(reject) {
    return this._execute().catch(reject);
  }

  async _execute() {
    let docs = this._collection._findRaw(this._filter);

    if (this._sortSpec) {
      const [key, dir] = Object.entries(this._sortSpec)[0];
      docs.sort((a, b) => {
        const av = toComparable(a[key] ?? "");
        const bv = toComparable(b[key] ?? "");
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === -1 || dir === "desc" ? -cmp : cmp;
      });
    }

    if (this._selectSpec) {
      docs = docs.map((d) => applySelect(d, this._selectSpec));
    }

    if (this._populateSpecs.length > 0) {
      docs = await Promise.all(docs.map((d) => populateDoc(d, this._populateSpecs)));
    }

    if (this._type === "findOne") {
      const first = docs[0];
      return first ? makeDocument(first, this._collection) : null;
    }

    return docs.map((d) => makeDocument(d, this._collection));
  }
}

// ─── Coleção SQLite (API compatível com Mongoose Model) ──────────────────────
export class SqliteCollection {
  constructor(db, collectionName) {
    this._db = db;
    this._name = collectionName;
    this._table = collectionName.replace(/[^a-zA-Z0-9_]/g, "_");
    this._ensureTable();
    registerCollection(collectionName, this);
  }

  _ensureTable() {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS "${this._table}" (
        _id        TEXT    PRIMARY KEY,
        data       TEXT    NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  _rowToDoc(row) {
    if (!row) return null;
    const data = JSON.parse(row.data);
    return {
      ...data,
      _id: row._id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  _findRaw(filter) {
    const rows = this._db.prepare(`SELECT * FROM "${this._table}"`).all();
    const docs = rows.map((r) => this._rowToDoc(r));
    if (!filter || Object.keys(filter).length === 0) return docs;
    return docs.filter((d) => matchesFilter(d, filter));
  }

  _findByIdRaw(id) {
    const row = this._db
      .prepare(`SELECT * FROM "${this._table}" WHERE _id = ?`)
      .get(id);
    return this._rowToDoc(row);
  }

  _updateByIdRaw(id, data) {
    const { _id, createdAt, updatedAt, ...rest } = data;
    this._db
      .prepare(
        `UPDATE "${this._table}" SET data = ?, updated_at = ? WHERE _id = ?`
      )
      .run(JSON.stringify(rest), Date.now(), id);
  }

  // ── Métodos de modelo (compatíveis com Mongoose) ────────────────────────

  find(filter) {
    return new SqliteQuery(this, "find", filter ?? {});
  }

  findOne(filter) {
    return new SqliteQuery(this, "findOne", filter ?? {});
  }

  async findById(id) {
    const doc = this._findByIdRaw(String(id));
    return doc ? makeDocument(doc, this) : null;
  }

  async create(data) {
    const now = Date.now();
    const _id = generateId();
    const { _id: _a, createdAt: _b, updatedAt: _c, ...rest } = data;

    this._db
      .prepare(
        `INSERT INTO "${this._table}" (_id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`
      )
      .run(_id, JSON.stringify(rest), now, now);

    const row = this._db
      .prepare(`SELECT * FROM "${this._table}" WHERE _id = ?`)
      .get(_id);
    return makeDocument(this._rowToDoc(row), this);
  }

  async insertMany(docs) {
    const items = Array.isArray(docs) ? docs : [];
    const created = [];

    for (const doc of items) {
      created.push(await this.create(doc));
    }

    return created;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const row = this._db
      .prepare(`SELECT * FROM "${this._table}" WHERE _id = ?`)
      .get(String(id));
    if (!row) return null;

    const current = this._rowToDoc(row);
    const { _id: _a, createdAt: _b, updatedAt: _c, ...currentRest } = current;
    const { _id: _d, createdAt: _e, updatedAt: _f, ...updateRest } = update;
    const merged = { ...currentRest, ...updateRest };
    const now = Date.now();

    this._db
      .prepare(
        `UPDATE "${this._table}" SET data = ?, updated_at = ? WHERE _id = ?`
      )
      .run(JSON.stringify(merged), now, String(id));

    if (options.new !== false) {
      const updated = this._findByIdRaw(String(id));
      return updated ? makeDocument(updated, this) : null;
    }
    return makeDocument(current, this);
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const current = this._findRaw(filter ?? {})[0];
    if (!current) return null;

    const id = current._id;
    const { _id: _a, createdAt: _b, updatedAt: _c, ...currentRest } = current;
    const { _id: _d, createdAt: _e, updatedAt: _f, ...updateRest } = update ?? {};
    const merged = { ...currentRest, ...updateRest };
    const now = Date.now();

    this._db
      .prepare(
        `UPDATE "${this._table}" SET data = ?, updated_at = ? WHERE _id = ?`
      )
      .run(JSON.stringify(merged), now, String(id));

    if (options.new !== false) {
      const updated = this._findByIdRaw(String(id));
      return updated ? makeDocument(updated, this) : null;
    }
    return makeDocument(current, this);
  }

  async findByIdAndDelete(id) {
    const doc = this._findByIdRaw(String(id));
    if (!doc) return null;
    this._db
      .prepare(`DELETE FROM "${this._table}" WHERE _id = ?`)
      .run(String(id));
    return makeDocument(doc, this);
  }

  async exists(filter) {
    const docs = this._findRaw(filter);
    return docs.length > 0 ? { _id: docs[0]._id } : null;
  }

  async countDocuments(filter) {
    return this._findRaw(filter ?? {}).length;
  }

  async deleteMany(filter) {
    const docs = this._findRaw(filter ?? {});
    for (const doc of docs) {
      this._db
        .prepare(`DELETE FROM "${this._table}" WHERE _id = ?`)
        .run(doc._id);
    }
    return { deletedCount: docs.length };
  }
}
