/** Admins (ADMIN_EMAILS, comma-separated) can feature roadmaps in the template gallery. */
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.toLowerCase())
}
