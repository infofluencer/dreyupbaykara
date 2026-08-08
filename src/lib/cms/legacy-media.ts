import catalog from "./legacy-media.json";

export type LegacySiteImage = {
  publicPath: string;
  objectPath: string;
  alt: string;
  pageSlugs: string[];
};

export const LEGACY_SITE_IMAGES = catalog.images as LegacySiteImage[];

export function mimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "avif":
      return "image/avif";
    default:
      throw new Error(`Desteklenmeyen görsel türü: ${fileName}`);
  }
}
