import { useEffect, useState } from "react"

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.id) {
          setUserId(data.user.id)
        }
      })
      .catch(() => {})
  }, [])

  return userId
}
