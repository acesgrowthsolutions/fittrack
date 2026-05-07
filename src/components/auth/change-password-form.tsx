"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/lib/auth-client"

export function ChangePasswordForm({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true)
  const [formError, setFormError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setFormError("New password must be at least 8 characters")
      return
    }

    if (newPassword === currentPassword) {
      setFormError("New password must be different from the current password")
      return
    }

    setIsPending(true)

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      })

      if (result.error) {
        const code = result.error.code
        const status = result.error.status
        const friendly =
          status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : code === "INVALID_PASSWORD" || code === "INVALID_EMAIL_OR_PASSWORD"
              ? "Current password is incorrect"
              : result.error.message || "Failed to change password"
        setFormError(friendly)
        setIsPending(false)
        return
      }

      setSuccess(true)
      setIsPending(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onSuccess?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred")
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
        <Input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={isPending}
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={revokeOtherSessions}
          onChange={(e) => setRevokeOtherSessions(e.target.checked)}
          disabled={isPending}
          className="mt-1"
        />
        <span>Sign out other devices</span>
      </label>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Password changed successfully.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Changing..." : "Change password"}
        </Button>
      </div>
    </form>
  )
}
