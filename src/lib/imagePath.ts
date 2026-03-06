export function withBase(p: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const b = base.endsWith("/") ? base : base + "/";
  const path = p.startsWith("/") ? p.slice(1) : p;
  return b + path;
}