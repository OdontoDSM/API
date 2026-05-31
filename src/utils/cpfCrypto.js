import crypto from "crypto";

const ENCRYPTED_PREFIX = "enc:v1";

function parseBufferLikeToHex(bufferLike) {
  if (!bufferLike) return "";

  const values = Array.isArray(bufferLike)
    ? bufferLike
    : Object.keys(bufferLike)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => bufferLike[key]);

  if (!values || values.length === 0) return "";

  const bytes = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 255);

  if (bytes.length !== 12) return "";

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stripCpfMask(value = "") {
  return String(value).replace(/\D/g, "").trim();
}

function getCipherKey() {
  const secret =
    process.env.CPF_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "odonto-care-dev-cpf-key";

  return crypto.createHash("sha256").update(secret).digest();
}

export function normalizeCpf(cpf = "") {
  const raw = String(cpf || "").trim();
  if (!raw) return "";
  if (isEncryptedCpf(raw)) {
    return decryptCpf(raw);
  }
  return stripCpfMask(raw);
}

export function hashCpf(cpf = "") {
  const normalized = normalizeCpf(cpf);
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function isEncryptedCpf(value = "") {
  return String(value).startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptCpf(cpf = "") {
  const normalized = normalizeCpf(cpf);
  if (!normalized) return "";
  if (isEncryptedCpf(normalized)) return normalized;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptCpf(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!isEncryptedCpf(raw)) {
    return stripCpfMask(raw);
  }

  const parts = raw.split(":");
  if (parts.length !== 5) {
    return raw;
  }

  try {
    const iv = Buffer.from(parts[2], "hex");
    const authTag = Buffer.from(parts[3], "hex");
    const encrypted = Buffer.from(parts[4], "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", getCipherKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");

    return stripCpfMask(decrypted);
  } catch {
    return raw;
  }
}

export function buildSecuredCpf(cpf = "") {
  const normalized = normalizeCpf(cpf);
  if (!normalized) {
    return { cpf: "", cpfHash: "" };
  }

  return {
    cpf: encryptCpf(normalized),
    cpfHash: hashCpf(normalized),
  };
}

function toPlainObject(value) {
  if (value && typeof value.toObject === "function") {
    return value.toObject();
  }
  return value;
}

export function serializeWithDecryptedCpf(value) {
  if (Array.isArray(value)) {
    return value.map((item) => serializeWithDecryptedCpf(item));
  }

  const raw = toPlainObject(value);

  if (!raw || typeof raw !== "object") {
    return raw;
  }

  // Mantem ObjectId (Mongo) serializado como string legivel para o frontend.
  if (typeof raw.toHexString === "function") {
    return raw.toHexString();
  }

  if (raw.buffer) {
    const hexId = parseBufferLikeToHex(raw.buffer);
    if (hexId) {
      return hexId;
    }
  }

  if (raw.type === "Buffer" && raw.data) {
    const hexId = parseBufferLikeToHex(raw.data);
    if (hexId) {
      return hexId;
    }
  }

  if (raw._bsontype === "ObjectId" && typeof raw.toString === "function") {
    const objectIdText = raw.toString();
    if (objectIdText && objectIdText !== "[object Object]") {
      return objectIdText;
    }
  }

  if (raw instanceof Date) {
    return raw;
  }

  const output = {};

  for (const [key, currentValue] of Object.entries(raw)) {
    if (key === "cpfHash") {
      continue;
    }

    if (key === "cpf") {
      output[key] = decryptCpf(currentValue);
      continue;
    }

    output[key] = serializeWithDecryptedCpf(currentValue);
  }

  return output;
}
