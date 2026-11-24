/**
 * URL API dibaca dari NEXT_PUBLIC_API_URL saat build.
 * Default hanya untuk pengembangan lokal; deploy wajib mengisi env ini.
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");
