import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { connectDB } from "../../src/config/database.js";
import File from "../../src/models/File.js";
import MedicalRecord from "../../src/models/MedicalRecord.js";
import User from "../../src/models/User.js";
import { uploadsDir } from "../../src/middleware/upload.middleware.js";

const APPLY = process.argv.includes("--apply");

function getDatePartsFromDoc(doc) {
  const fallbackDate = new Date();
  const sourceDate = doc.uploadedAt || doc.createdAt || doc.updatedAt || fallbackDate;
  const date = new Date(sourceDate);

  const year = String(Number.isNaN(date.getTime()) ? fallbackDate.getFullYear() : date.getFullYear());
  const month = String(Number.isNaN(date.getTime()) ? fallbackDate.getMonth() + 1 : date.getMonth() + 1).padStart(2, "0");

  return { year, month };
}

function extractYearMonthFromPathSegments(segments, doc) {
  for (let i = 0; i < segments.length - 1; i += 1) {
    const year = segments[i];
    const month = segments[i + 1];

    if (/^\d{4}$/.test(year) && /^(0[1-9]|1[0-2])$/.test(month)) {
      return { year, month };
    }
  }

  return getDatePartsFromDoc(doc);
}

function parseUploadRelativePath(fileUrl) {
  let pathname = fileUrl;

  try {
    pathname = new URL(fileUrl).pathname;
  } catch {
    pathname = fileUrl;
  }

  if (typeof pathname !== "string" || !pathname.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = decodeURIComponent(pathname.replace(/^\/uploads\//, ""));
  return relativePath.split(path.sep).join("/");
}

function buildUpdatedUploadUrl(originalUrl, newRelativePath) {
  const normalized = newRelativePath.split(path.sep).join("/");

  try {
    const parsed = new URL(originalUrl);
    return `${parsed.origin}/uploads/${normalized}`;
  } catch {
    if (typeof originalUrl === "string" && originalUrl.startsWith("/uploads/")) {
      return `/uploads/${normalized}`;
    }

    return originalUrl;
  }
}

function resolveAbsoluteUploadPath(relativePath) {
  const absolutePath = path.resolve(uploadsDir, relativePath);
  const normalizedUploadsDir = path.resolve(uploadsDir);

  if (!absolutePath.startsWith(normalizedUploadsDir)) {
    return null;
  }

  return absolutePath;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function moveFileSafely(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  try {
    await fs.rename(sourcePath, targetPath);
    return;
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }
  }

  await fs.copyFile(sourcePath, targetPath);
  await fs.unlink(sourcePath).catch(() => null);
}

async function migrateExamFiles() {
  const files = await File.find({
    fileUrl: { $exists: true, $ne: null },
  })
    .select("_id medicalRecord fileUrl fileName uploadedAt createdAt updatedAt")
    .lean();

  const recordIds = [...new Set(files.map((f) => String(f.medicalRecord || "")).filter(Boolean))];

  const records = await MedicalRecord.find({ _id: { $in: recordIds } })
    .select("_id patient")
    .lean();

  const patientIdByRecordId = new Map();
  for (const record of records) {
    patientIdByRecordId.set(String(record._id), String(record.patient || ""));
  }

  const stats = {
    total: files.length,
    localUploads: 0,
    alreadyInTarget: 0,
    migrated: 0,
    missingPatient: 0,
    sourceMissing: 0,
    skippedExternal: 0,
    skippedInvalidPath: 0,
  };

  for (const file of files) {
    const relativePath = parseUploadRelativePath(file.fileUrl || "");

    if (!relativePath) {
      stats.skippedExternal += 1;
      continue;
    }

    stats.localUploads += 1;

    const patientId = patientIdByRecordId.get(String(file.medicalRecord || ""));
    if (!patientId) {
      stats.missingPatient += 1;
      continue;
    }

    const segments = relativePath.split("/").filter(Boolean);
    const fileName = path.posix.basename(relativePath);
    const { year, month } = extractYearMonthFromPathSegments(segments, file);

    const newRelativePath = path.posix.join("exams", patientId, year, month, fileName);

    if (relativePath === newRelativePath) {
      stats.alreadyInTarget += 1;
      continue;
    }

    const sourceAbsolutePath = resolveAbsoluteUploadPath(relativePath);
    const targetAbsolutePath = resolveAbsoluteUploadPath(newRelativePath);

    if (!sourceAbsolutePath || !targetAbsolutePath) {
      stats.skippedInvalidPath += 1;
      continue;
    }

    const sourceExists = await pathExists(sourceAbsolutePath);
    const targetExists = await pathExists(targetAbsolutePath);

    if (APPLY) {
      if (sourceExists && !targetExists) {
        await moveFileSafely(sourceAbsolutePath, targetAbsolutePath);
      }

      if (!sourceExists && !targetExists) {
        stats.sourceMissing += 1;
        continue;
      }

      const newUrl = buildUpdatedUploadUrl(file.fileUrl, newRelativePath);
      await File.findByIdAndUpdate(file._id, { fileUrl: newUrl }, { new: false });
    } else if (!sourceExists && !targetExists) {
      stats.sourceMissing += 1;
      continue;
    }

    stats.migrated += 1;
  }

  console.log("\n[UPLOAD_MIGRATION] exames");
  console.log(`- total: ${stats.total}`);
  console.log(`- localUploads: ${stats.localUploads}`);
  console.log(`- migrated: ${stats.migrated}`);
  console.log(`- alreadyInTarget: ${stats.alreadyInTarget}`);
  console.log(`- missingPatient: ${stats.missingPatient}`);
  console.log(`- sourceMissing: ${stats.sourceMissing}`);
  console.log(`- skippedExternal: ${stats.skippedExternal}`);
  console.log(`- skippedInvalidPath: ${stats.skippedInvalidPath}`);

  return stats;
}

async function migrateProfilePhotos() {
  const users = await User.find({
    profilePhotoUrl: { $exists: true, $ne: null },
  })
    .select("_id profilePhotoUrl")
    .lean();

  const stats = {
    total: users.length,
    localUploads: 0,
    alreadyInTarget: 0,
    migrated: 0,
    sourceMissing: 0,
    skippedExternal: 0,
    skippedInvalidPath: 0,
  };

  for (const user of users) {
    const relativePath = parseUploadRelativePath(user.profilePhotoUrl || "");

    if (!relativePath) {
      stats.skippedExternal += 1;
      continue;
    }

    stats.localUploads += 1;

    const fileName = path.posix.basename(relativePath);
    const userId = String(user._id);
    const newRelativePath = path.posix.join("profile_pics", userId, fileName);

    if (relativePath === newRelativePath) {
      stats.alreadyInTarget += 1;
      continue;
    }

    const sourceAbsolutePath = resolveAbsoluteUploadPath(relativePath);
    const targetAbsolutePath = resolveAbsoluteUploadPath(newRelativePath);

    if (!sourceAbsolutePath || !targetAbsolutePath) {
      stats.skippedInvalidPath += 1;
      continue;
    }

    const sourceExists = await pathExists(sourceAbsolutePath);
    const targetExists = await pathExists(targetAbsolutePath);

    if (APPLY) {
      if (sourceExists && !targetExists) {
        await moveFileSafely(sourceAbsolutePath, targetAbsolutePath);
      }

      if (!sourceExists && !targetExists) {
        stats.sourceMissing += 1;
        continue;
      }

      const newUrl = buildUpdatedUploadUrl(user.profilePhotoUrl, newRelativePath);
      await User.findByIdAndUpdate(user._id, { profilePhotoUrl: newUrl }, { new: false });
    } else if (!sourceExists && !targetExists) {
      stats.sourceMissing += 1;
      continue;
    }

    stats.migrated += 1;
  }

  console.log("\n[UPLOAD_MIGRATION] fotos de perfil");
  console.log(`- total: ${stats.total}`);
  console.log(`- localUploads: ${stats.localUploads}`);
  console.log(`- migrated: ${stats.migrated}`);
  console.log(`- alreadyInTarget: ${stats.alreadyInTarget}`);
  console.log(`- sourceMissing: ${stats.sourceMissing}`);
  console.log(`- skippedExternal: ${stats.skippedExternal}`);
  console.log(`- skippedInvalidPath: ${stats.skippedInvalidPath}`);

  return stats;
}

async function main() {
  await connectDB();

  console.log("\n[UPLOAD_MIGRATION] iniciando");
  console.log(`- dryRun: ${!APPLY}`);

  await migrateExamFiles();
  await migrateProfilePhotos();

  if (!APPLY) {
    console.log("\n[UPLOAD_MIGRATION] Execute novamente com --apply para persistir as atualizacoes.");
  } else {
    console.log("\n[UPLOAD_MIGRATION] concluida com sucesso.");
  }
}

main().catch((error) => {
  console.error("[UPLOAD_MIGRATION] falha:", error);
  process.exit(1);
});
