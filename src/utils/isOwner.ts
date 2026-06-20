export function isOwner(email: string | undefined | null): boolean {
  if (!email) return false
  const ownerEmail = import.meta.env.VITE_OWNER_EMAIL
  if (!ownerEmail) return false
  return email.toLowerCase() === ownerEmail.toLowerCase()
}
