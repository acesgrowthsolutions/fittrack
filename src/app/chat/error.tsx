"use client";

import { useEffect } from "react";
import { MessageSquareWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <MessageSquareWarning className="text-destructive h-16 w-16" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Chat Error</h1>
        <p className="text-muted-foreground mb-6">
          There was a problem with the chat service. This could be due to a connection issue or the
          AI service being temporarily unavailable.
        </p>
        {error.message && (
          <p className="text-muted-foreground bg-muted mb-4 rounded p-2 text-sm">{error.message}</p>
        )}
        <div className="flex justify-center gap-4">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
