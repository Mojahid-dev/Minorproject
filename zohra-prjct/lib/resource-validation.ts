export const MAX_RESOURCE_SIZE_BYTES = 100 * 1024 * 1024;

const supportedExtensions = new Set([
  "pdf", "doc", "docx", "ppt", "pptx", "txt", "md", "jpg", "jpeg", "png" 
]);

export const SUPPORTED_RESOURCE_MIME_TYPES = [
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/markdown", "image/jpeg", "image/png"
] as const;

const supportedMimeTypes = new Set<string>(SUPPORTED_RESOURCE_MIME_TYPES);

export function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateResourceFile({ name, type, size }: { name: string; type: string; size: number }) {
  const extension = getFileExtension(name);

  if (!name.trim() || !extension) return "A file name and extension are required.";
  if (size <= 0) return "Empty files cannot be uploaded.";
  if (size > MAX_RESOURCE_SIZE_BYTES) return "Files must be 100 MB or smaller.";
  if (!supportedExtensions.has(extension)) return `.${extension || "unknown"} the type of files are not supported.`;
  if (type && !supportedMimeTypes.has(type)) return "This file type is not supported.";

  return null;
}
