import mongoose from "mongoose";
import { getDbType } from "../config/database.js";

function toIdString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    if (value.$oid) return String(value.$oid).trim();
    if (value._id) return toIdString(value._id);
    if (value.id) return toIdString(value.id);
    if (typeof value.toString === "function") {
      const raw = value.toString();
      if (raw && raw !== "[object Object]") return String(raw).trim();
    }
  }
  return "";
}

export function isValidDbId(value) {
  const id = toIdString(value);
  if (!id) return false;

  if (getDbType() === "mongodb") {
    return mongoose.isValidObjectId(id);
  }

  return true;
}
