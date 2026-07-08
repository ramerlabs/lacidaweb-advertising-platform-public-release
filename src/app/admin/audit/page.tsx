"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Log = {
  id: string;
  action: string;
  message: string | null;
  createdAt: string;
  team: { name: string; slug: string } | null;
  user: { email: string; name: string | null } | null;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">Recent platform and team activity</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Payments, posts, and system actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.message ? <p className="mt-1 text-muted-foreground">{log.message}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.team?.name || "—"} · {log.user?.email || "system"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
