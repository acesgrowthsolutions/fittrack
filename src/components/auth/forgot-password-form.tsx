"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/lib/auth-client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsPending(true)

    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })

      if (result.error) {
        const status = result.error.status
        const code = result.error.code
        const friendly =
          status === 429 || code === "TOO_MANY_REQUESTS"
            ? "Too many reset requests. Please try again in a few minutes."
            : result.error.message || "Failed to send reset email"
        setError(friendly)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 w-full max-w-sm text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, a password reset link has been
          sent. Check your inbox (and spam folder).
        </p>
        {process.env.NODE_ENV !== "production" && (
          <p className="text-xs text-muted-foreground">
            In development, the reset link is printed to the dev-server
            terminal if no email provider is configured.
          </p>
        )}
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </form>
  )
}
