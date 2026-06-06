export function UserEmail({ email }: { email?: string | null }) {
  return <span>{email ?? "Usuario"}</span>
}
