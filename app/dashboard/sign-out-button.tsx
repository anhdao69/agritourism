// app/dashboard/sign-out-button.tsx (Client Component)
"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ marginTop: 16 }}
    >
      Sign out
    </button>
  )
}