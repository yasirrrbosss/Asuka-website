export type Result = { ok: true } | { ok: false; reason: string };

const ok: Result = { ok: true };
const fail = (reason: string): Result => ({ ok: false, reason });

export function validateWhatsApp(raw: string): Result {
  if (!raw) return fail("WhatsApp wajib diisi");
  const cleaned = raw.replace(/[\s\-.]/g, "");
  if (/^08[1-9]\d{7,11}$/.test(cleaned)) return ok;
  if (/^\+628[1-9]\d{7,11}$/.test(cleaned)) return ok;
  return fail("Format tidak valid (contoh: 0812-3456-7890)");
}

export function validateName(raw: string): Result {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < 2) return fail("Nama minimal 2 karakter");
  return ok;
}

export function validateAddress(raw: string): Result {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < 10) return fail("Alamat minimal 10 karakter");
  return ok;
}
