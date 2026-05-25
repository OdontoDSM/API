import { fileType, fileUrl } from "./random.js";

export function makeFile({ medicalRecordId, overrides = {} }) {
  return {
    medicalRecord: medicalRecordId,
    fileType: overrides.fileType ?? fileType(),
    fileUrl: overrides.fileUrl ?? fileUrl(),
    uploadedAt: overrides.uploadedAt ?? new Date(),
    ...overrides,
  };
}
