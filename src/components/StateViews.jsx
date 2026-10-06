import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Inbox, FileQuestion, ShieldOff, WifiOff, RefreshCw } from "lucide-react";

// Reusable state views every data screen ships. Plain, neutral, accessible.

export function TableSkeleton({ rows = 6, cols = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = Inbox }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center text-center py-12">
        <Icon className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
        {actionLabel && (
          <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center justify-center text-center py-12">
        <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message || "Unexpected error"}</p>
        {onRetry && (
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NotFoundState({ entity = "Record" }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center text-center py-16">
        <FileQuestion className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{entity} not found</p>
        <p className="text-sm text-muted-foreground mt-1">It may have been deleted, or you don't have access to it.</p>
      </CardContent>
    </Card>
  );
}

export function PermissionDeniedState({ message }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center text-center py-16">
        <ShieldOff className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message || "You don't have permission to view this."}</p>
      </CardContent>
    </Card>
  );
}

export function OfflineBanner() {
  const [online, setOnline] = React.useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="bg-amber-500 text-amber-950 text-sm px-4 py-2 text-center font-medium">
      <WifiOff className="inline w-4 h-4 mr-2 align-text-bottom" />You're offline. Changes may not save until you reconnect.
    </div>
  );
}