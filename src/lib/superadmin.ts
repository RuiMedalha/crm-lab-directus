export function isSuperAdminEmail(email?: string | null): boolean {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;

  const raw = String((import.meta as any)?.env?.VITE_SUPERADMIN_EMAILS || "").trim();
  const list = (raw || "ruimedalha@hotelequip.pt")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return list.includes(e);
}

