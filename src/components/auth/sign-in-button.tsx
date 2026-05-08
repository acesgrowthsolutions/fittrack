"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"
import { GoogleSignInButton } from "./google-sign-in-button"

export function SignInButton() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsPending(true)

    try {
      const result = await signIn.email({ email, password })

      if (result.error) {
        // Better Auth returns specific error codes; surface them more clearly
        // than the generic message so users know what's wrong.
        const status = result.error.status
        const code = result.error.code
        const friendly =
          status === 429 || code === "TOO_MANY_REQUESTS"
            ? "Too many sign-in attempts. Please wait a minute and try again."
            : code === "INVALID_EMAIL_OR_PASSWORD"
              ? "Invalid email or password"
              : code === "EMAIL_NOT_VERIFIED"
                ? "Please verify your email before signing in"
                : result.error.message || "Failed to sign in"
        setError(friendly)
        setIsPending(false)
        return
      }

      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <GoogleSignInButton disabled={isPending} />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:underline">
          Forgot password?
        </Link>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </form>
  )
}
