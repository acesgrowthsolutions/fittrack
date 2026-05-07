"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, LogOut, Monitor, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  useSession,
} from "@/lib/auth-client"

type SessionRow = {
  id: string
  token: string
  createdAt: string | Date
  expiresAt: string | Date
  ipAddress?: string | null
  userAgent?: string | null
}

function describeUserAgent(ua: string | null | undefined): {
  label: string
  isMobile: boolean
} {
  if (!ua) return { label: "Unknown device", isMobile: false }
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser"
  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS"
  return { label: `${browser} on ${os}`, isMobile }
}

function timeAgo(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return "just now"
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

export function SessionsList() {
  const { data: session } = useSession()
  const currentToken = session?.session.token
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [revokingOthers, setRevokingOthers] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const result = await listSessions()
    if (result.error) {
      setError(result.error.message || "Failed to load sessions")
      return
    }
    setSessions(result.data as unknown as SessionRow[])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRevoke = async (token: string) => {
    setRevokingToken(token)
    try {
      const result = await revokeSession({ token })
      if (result.error) {
        toast.error(result.error.message || "Failed to revoke session")
        return
      }
      toast.success("Session revoked")
      await load()
    } finally {
      setRevokingToken(null)
    }
  }

  const handleRevokeOthers = async () => {
    setRevokingOthers(true)
    try {
      const result = await revokeOtherSessions()
      if (result.error) {
        toast.error(result.error.message || "Failed to sign out other devices")
        return
      }
      toast.success("Signed out all other devices")
      await load()
    } finally {
      setRevokingOthers(false)
    }
  }

  if (sessions === null && !error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sessions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-destructive p-4 border rounded-lg">
        {error}
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg">
        No active sessions found.
      </div>
    )
  }

  const others = sessions.filter((s) => s.token !== currentToken)

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const { label, isMobile } = describeUserAgent(s.userAgent)
        const isCurrent = s.token === currentToken
        const Icon = isMobile ? Smartphone : Monitor
        return (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{label}</p>
                  {isCurrent && (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      This device
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}signed in{" "}
                  {timeAgo(s.createdAt)}
                </p>
              </div>
            </div>
            {!isCurrent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(s.token)}
                disabled={revokingToken === s.token}
              >
                {revokingToken === s.token ? "Revoking..." : "Revoke"}
              </Button>
            )}
          </div>
        )
      })}
      {others.length > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeOthers}
            disabled={revokingOthers}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {revokingOthers
              ? "Signing out others..."
              : `Sign out ${others.length} other device${others.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  )
}
