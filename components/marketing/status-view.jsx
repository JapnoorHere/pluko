"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const rows = (data) => [
  ["API", data.api === "ok", "Accepting requests", "Not responding"],
  ["Search worker", data.worker === "online", "Processing searches", "Offline: searches wait in the queue"],
  ["Image source", data.provider === "enabled", "Enabled", "Paused by an operator: queued searches are held"],
];

export default function StatusView() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/v1/status", { cache: "no-store" });
      if (!response.ok) throw new Error("bad status");
      setData(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [check]);

  const healthy = data && !failed && data.status === "ok";
  return (
    <div className="space-y-4" aria-live="polite">
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${failed ? "border-destructive/50" : healthy ? "border-primary/40" : ""}`}>
        {failed || (data && !healthy) ? <CircleAlert className="size-6 text-destructive" /> : <CheckCircle2 className="size-6 text-primary" />}
        <div>
          <strong className="block text-lg">
            {failed ? "We could not reach the service" : !data ? "Checking…" : healthy ? "All systems working" : "Degraded"}
          </strong>
          <span className="text-sm text-muted-foreground">
            {failed
              ? "Your connection or the service may be down. Try again shortly."
              : data
                ? `Checked ${new Date(data.checked_at).toLocaleTimeString()} · refreshes every 30 seconds`
                : "Contacting the service"}
          </span>
        </div>
        <Button type="button" variant="outline" size="sm" className="ml-auto" disabled={loading} onClick={check}>
          <RefreshCw />
          Check now
        </Button>
      </div>
      {data && !failed && (
        <ul className="divide-y rounded-xl border">
          {rows(data).map(([name, ok, good, bad]) => (
            <li key={name} className="flex items-center justify-between gap-4 p-4">
              <span className="font-medium">{name}</span>
              <span className={`flex items-center gap-2 text-sm ${ok ? "text-muted-foreground" : "text-destructive"}`}>
                {ok ? <CheckCircle2 className="size-4 text-primary" /> : <CircleAlert className="size-4" />}
                {ok ? good : bad}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
