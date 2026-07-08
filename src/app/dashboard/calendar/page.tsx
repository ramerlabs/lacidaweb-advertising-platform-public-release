"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Post = {
  id: string;
  content: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
};

export default function CalendarPage() {
  const { teamId } = useTeam();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/posts?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []));
  }, [teamId]);

  const monthLabel = cursor.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const startDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();

  const byDay = useMemo(() => {
    const map = new Map<number, Post[]>();
    for (const post of posts) {
      const date = post.scheduledFor ? new Date(post.scheduledFor) : new Date(post.createdAt);
      if (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear()) continue;
      const day = date.getDate();
      map.set(day, [...(map.get(day) || []), post]);
    }
    return map;
  }, [posts, cursor]);

  const cells: (number | null)[] = [
    ...Array.from({ length: startDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content calendar</h1>
          <p className="text-muted-foreground">Scheduled and published posts by day</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Next
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{monthLabel}</CardTitle>
          <CardDescription>Click Compose to schedule new posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[88px] rounded-md border p-1 text-xs ${day ? "bg-card" : "bg-transparent border-transparent"}`}
              >
                {day ? <div className="mb-1 font-medium text-muted-foreground">{day}</div> : null}
                {(byDay.get(day || 0) || []).slice(0, 2).map((post) => (
                  <div key={post.id} className="mb-1 truncate rounded bg-primary/10 px-1 py-0.5" title={post.content}>
                    <Badge variant="outline" className="mr-1 px-1 py-0 text-[10px]">
                      {post.status}
                    </Badge>
                    {post.content.slice(0, 24)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
