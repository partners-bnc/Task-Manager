export const AUDITING_UPLOAD_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function formatAuditingFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const sizeInMb = bytes / (1024 * 1024);
  const rounded = sizeInMb >= 10 ? Math.round(sizeInMb) : Number.parseFloat(sizeInMb.toFixed(2));
  return `${rounded} MB`;
}

export function splitAuditingFilesBySize(files, sizeLimit = AUDITING_UPLOAD_MAX_FILE_SIZE_BYTES) {
  return Array.from(files || []).reduce(
    (result, file) => {
      if (!(file instanceof File)) {
        return result;
      }

      if (file.size > sizeLimit) {
        result.rejectedFiles.push(file);
      } else {
        result.validFiles.push(file);
      }

      return result;
    },
    { validFiles: [], rejectedFiles: [] }
  );
}

export function buildAuditingFileSizeLimitMessage(files, sizeLimit = AUDITING_UPLOAD_MAX_FILE_SIZE_BYTES) {
  const limitText = formatAuditingFileSize(sizeLimit);
  const fileList = files
    .map((file) => `"${file.name}" (${formatAuditingFileSize(file.size)})`)
    .join(', ');

  return files.length === 1
    ? `${fileList} exceeds the ${limitText} file size limit.`
    : `${fileList} exceed the ${limitText} file size limit.`;
}

export async function readResponsePayload(response) {
  const rawText = await response.text();
  if (!rawText) return {};

  try {
    return JSON.parse(rawText);
  } catch {
    return { error: rawText };
  }
}
