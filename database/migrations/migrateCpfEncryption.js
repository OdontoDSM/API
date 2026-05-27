import "dotenv/config";
import { connectDB } from "../../src/config/database.js";
import User from "../../src/models/User.js";
import Patient from "../../src/models/Patient.js";
import {
  buildSecuredCpf,
  hashCpf,
  normalizeCpf,
} from "../../src/utils/cpfCrypto.js";

async function migrateCollection(model, label) {
  const docs = await model.find({}).sort({ createdAt: 1 });
  const seenHashes = new Set();

  const result = {
    total: docs.length,
    updated: 0,
    skippedInvalidCpf: 0,
    skippedDuplicateCpf: 0,
  };

  for (const doc of docs) {
    const plainCpf = normalizeCpf(doc.cpf || "");

    if (!plainCpf || plainCpf.length !== 11) {
      result.skippedInvalidCpf += 1;
      continue;
    }

    const cpfHash = hashCpf(plainCpf);

    if (seenHashes.has(cpfHash)) {
      result.skippedDuplicateCpf += 1;
      continue;
    }

    seenHashes.add(cpfHash);

    const isAlreadyMigrated =
      doc.cpfHash === cpfHash &&
      typeof doc.cpf === "string" &&
      doc.cpf.startsWith("enc:v1:");

    if (isAlreadyMigrated) {
      continue;
    }

    const secured = buildSecuredCpf(plainCpf);
    doc.cpf = secured.cpf;
    doc.cpfHash = secured.cpfHash;

    await doc.save();
    result.updated += 1;
  }

  console.log(`\n[CPF MIGRATION] ${label}`);
  console.log(`- total: ${result.total}`);
  console.log(`- updated: ${result.updated}`);
  console.log(`- skippedInvalidCpf: ${result.skippedInvalidCpf}`);
  console.log(`- skippedDuplicateCpf: ${result.skippedDuplicateCpf}`);

  return result;
}

async function main() {
  await connectDB();

  await migrateCollection(User, "users");
  await migrateCollection(Patient, "patients");

  console.log("\n[CPF MIGRATION] concluida.");
}

main().catch((error) => {
  console.error("[CPF MIGRATION] falha:", error);
  process.exit(1);
});
