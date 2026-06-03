import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { connectDB } from "../../src/config/database.js";
import File from "../../src/models/File.js";
import MedicalRecord from "../../src/models/MedicalRecord.js";
import User from "../../src/models/User.js";
import { uploadsDir } from "../../src/middleware/upload.middleware.js";

const APPLY = process.argv.includes("--apply");
const FALLBACK_BASE_URL =
  process.env.PUBLIC_UPLOADS_BASE_URL ||
  process.env.APP_URL ||
  `http://localhost:${process.env.PORT || 3000}`;

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function getOriginFromUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith("/uploads/")) {
      return parsed.origin;
    }
  } catch {
    // ignorar URLs relativas ou inválidas
  }

  return FALLBACK_BASE_URL;
}

function buildPublicUrl(originalUrl, relativePath) {
  const normalizedRelative = relativePath.split(path.sep).join("/");
  const origin = getOriginFromUrl(originalUrl);
  return `${origin}/uploads/${normalizedRelative}`;
}

function parseLocalUploadRelativePath(value) {
  let pathname = value;

  try {
    pathname = new URL(value).pathname;
  } catch {
    pathname = value;
  }

  if (typeof pathname !== "string" || !pathname.startsWith("/uploads/")) {
    return null;
  }

  return decodeURIComponent(pathname.replace(/^\/uploads\//, ""));
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

async function walkFiles(rootDir) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      results.push({
        absolutePath,
        relativePath: path.relative(rootDir, absolutePath).split(path.sep).join("/"),
        basename: entry.name,
      });
    }
  }

  if (await pathExists(rootDir)) {
    await walk(rootDir);
  }

  return results;
}

function scoreCandidate(candidate, basename, hintFragments = []) {
  let score = 0;

  if (candidate.basename === basename) {
    score += 10;
  }

  const lowerRelative = candidate.relativePath.toLowerCase();
  for (const fragment of hintFragments) {
    if (fragment && lowerRelative.includes(String(fragment).toLowerCase())) {
      score += 5;
    }
  }

  if (lowerRelative.includes("profile_photo/")) {
    score += 3;
  }

  if (lowerRelative.includes("exams/")) {
    score += 3;
  }

  return score;
}

function pickBestCandidate(candidates, basename, hintFragments = []) {
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate, basename, hintFragments),
    }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0 || ranked[0].score <= 0) {
    return null;
  }

  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    return null;
  }

  return ranked[0];
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

function extractLegacyHint(relativePath) {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (segments[0] === "profile_photo") {
    return segments[1] || null;
  }

  if (segments[0] === "exams") {
    return segments[1] || null;
  }

  return segments[0];
}

async function migrateExams(allUploadFiles) {
  const files = await File.find({ fileUrl: { $exists: true, $ne: null } })
    .select("_id medicalRecord fileUrl fileName fileSize uploadedAt createdAt updatedAt")
    .lean();

  const recordIds = [...new Set(files.map((file) => String(file.medicalRecord || "")).filter(Boolean))];
  const records = await MedicalRecord.find({ _id: { $in: recordIds } })
    .select("_id patient")
    .lean();

  const patientIdByRecordId = new Map();
  for (const record of records) {
    patientIdByRecordId.set(String(record._id), String(record.patient || ""));
  }

  const uploadIndex = new Map();
  for (const candidate of allUploadFiles) {
    if (!uploadIndex.has(candidate.basename)) {
      uploadIndex.set(candidate.basename, []);
    }
    uploadIndex.get(candidate.basename).push(candidate);
  }

  const stats = {
    total: files.length,
    migrated: 0,
    alreadyInTarget: 0,
    sourceMissing: 0,
    ambiguous: 0,
    skippedInvalidPath: 0,
  };

  for (const file of files) {
    const patientId = patientIdByRecordId.get(String(file.medicalRecord || ""));
    if (!patientId) {
      stats.skippedInvalidPath += 1;
      continue;
    }

    const currentRelative = parseLocalUploadRelativePath(file.fileUrl || "");
    const currentAbsolute = currentRelative ? resolveAbsoluteUploadPath(currentRelative) : null;
    const currentExists = currentAbsolute ? await pathExists(currentAbsolute) : false;

    const basename =
      file.fileName ||
      (currentRelative ? path.posix.basename(currentRelative) : null) ||
      null;

    if (!basename) {
      stats.skippedInvalidPath += 1;
      continue;
    }

    const yearMonthSource = currentRelative ? currentRelative.split("/").filter(Boolean) : [];
    let year = String(new Date(file.uploadedAt || file.createdAt || file.updatedAt || Date.now()).getFullYear());
    let month = String(new Date(file.uploadedAt || file.createdAt || file.updatedAt || Date.now()).getMonth() + 1).padStart(2, "0");

    for (let i = 0; i < yearMonthSource.length - 1; i += 1) {
      if (/^\d{4}$/.test(yearMonthSource[i]) && /^(0[1-9]|1[0-2])$/.test(yearMonthSource[i + 1])) {
        year = yearMonthSource[i];
        month = yearMonthSource[i + 1];
        break;
      }
    }

    const targetRelative = path.posix.join("exams", patientId, year, month, basename);
    const targetAbsolute = resolveAbsoluteUploadPath(targetRelative);

    if (currentRelative && currentRelative === targetRelative) {
      stats.alreadyInTarget += 1;
      continue;
    }

    const hint = currentRelative ? extractLegacyHint(currentRelative) : null;
    const candidates = uploadIndex.get(basename) || [];
    const bestCandidate = currentExists
      ? { absolutePath: currentAbsolute, relativePath: currentRelative, basename }
      : pickBestCandidate(candidates, basename, [hint, patientId]);

    if (!bestCandidate) {
      stats.sourceMissing += 1;
      continue;
    }

    if (APPLY) {
      if (bestCandidate.absolutePath && bestCandidate.absolutePath !== targetAbsolute) {
        if (!(await pathExists(targetAbsolute))) {
          await moveFileSafely(bestCandidate.absolutePath, targetAbsolute);
        }
      }

      const nextUrl = buildPublicUrl(file.fileUrl || bestCandidate.relativePath, targetRelative);
      await File.findByIdAndUpdate(file._id, { fileUrl: nextUrl }, { new: false });
    }

    stats.migrated += 1;
  }

  console.log("\n[UPLOAD_LEGACY_FIX] exames");
  console.log(`- total: ${stats.total}`);
  console.log(`- migrated: ${stats.migrated}`);
  console.log(`- alreadyInTarget: ${stats.alreadyInTarget}`);
  console.log(`- sourceMissing: ${stats.sourceMissing}`);
  console.log(`- skippedInvalidPath: ${stats.skippedInvalidPath}`);

  return stats;
}

async function migrateProfilePhotos(allUploadFiles) {
  const users = await User.find({ profilePhotoUrl: { $exists: true, $ne: null } })
    .select("_id name profilePhotoUrl")
    .lean();

  const uploadIndex = new Map();
  for (const candidate of allUploadFiles) {
    if (!uploadIndex.has(candidate.basename)) {
      uploadIndex.set(candidate.basename, []);
    }
    uploadIndex.get(candidate.basename).push(candidate);
  }

  const stats = {
    total: users.length,
    migrated: 0,
    alreadyInTarget: 0,
    sourceMissing: 0,
    skippedInvalidPath: 0,
    skippedExternalWithoutLegacyFile: 0,
  };

  for (const user of users) {
    const userId = String(user._id);
    const userSlug = slugify(user.name || userId);
    const currentRelative = parseLocalUploadRelativePath(user.profilePhotoUrl || "");
    const currentAbsolute = currentRelative ? resolveAbsoluteUploadPath(currentRelative) : null;
    const currentExists = currentAbsolute ? await pathExists(currentAbsolute) : false;

    const basename =
      currentRelative ? path.posix.basename(currentRelative) : null;

    const legacyMatches = [];
    for (const candidate of allUploadFiles) {
      const lowerPath = candidate.relativePath.toLowerCase();
      if (lowerPath.includes(`profile_photo/${userSlug}`) || lowerPath.includes(`/${userSlug}/`)) {
        legacyMatches.push(candidate);
      }
    }

    const candidates = basename ? uploadIndex.get(basename) || [] : [];
    const bestCandidate = currentExists
      ? { absolutePath: currentAbsolute, relativePath: currentRelative, basename }
      : pickBestCandidate(legacyMatches.length > 0 ? legacyMatches : candidates, basename || userSlug, [userSlug, userId]);

    if (!bestCandidate) {
      if (currentRelative) {
        stats.sourceMissing += 1;
      } else {
        stats.skippedExternalWithoutLegacyFile += 1;
      }
      continue;
    }

    if (!basename) {
      stats.skippedInvalidPath += 1;
      continue;
    }

    const targetRelative = path.posix.join("profile_pics", userId, basename);
    const targetAbsolute = resolveAbsoluteUploadPath(targetRelative);

    if (currentRelative && currentRelative === targetRelative) {
      stats.alreadyInTarget += 1;
      continue;
    }

    if (APPLY) {
      if (bestCandidate.absolutePath && bestCandidate.absolutePath !== targetAbsolute) {
        if (!(await pathExists(targetAbsolute))) {
          await moveFileSafely(bestCandidate.absolutePath, targetAbsolute);
        }
      }

      const nextUrl = buildPublicUrl(user.profilePhotoUrl || bestCandidate.relativePath, targetRelative);
      await User.findByIdAndUpdate(user._id, { profilePhotoUrl: nextUrl }, { new: false });
    }

    stats.migrated += 1;
  }

  console.log("\n[UPLOAD_LEGACY_FIX] fotos de perfil");
  console.log(`- total: ${stats.total}`);
  console.log(`- migrated: ${stats.migrated}`);
  console.log(`- alreadyInTarget: ${stats.alreadyInTarget}`);
  console.log(`- sourceMissing: ${stats.sourceMissing}`);
  console.log(`- skippedInvalidPath: ${stats.skippedInvalidPath}`);
  console.log(`- skippedExternalWithoutLegacyFile: ${stats.skippedExternalWithoutLegacyFile}`);

  return stats;
}

async function main() {
  await connectDB();

  const allUploadFiles = await walkFiles(uploadsDir);

  console.log("\n[UPLOAD_LEGACY_FIX] iniciando");
  console.log(`- dryRun: ${!APPLY}`);
  console.log(`- arquivosEncontrados: ${allUploadFiles.length}`);

  await migrateExams(allUploadFiles);
  await migrateProfilePhotos(allUploadFiles);

  if (!APPLY) {
    console.log("\n[UPLOAD_LEGACY_FIX] Execute novamente com --apply para persistir as atualizacoes.");
  } else {
    console.log("\n[UPLOAD_LEGACY_FIX] concluida com sucesso.");
  }
}

main().catch((error) => {
  console.error("[UPLOAD_LEGACY_FIX] falha:", error);
  process.exit(1);
});
