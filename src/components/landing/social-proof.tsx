"use client";

import { useEffect, useState } from "react";

export function SocialProof() {
  const [stats, setStats] = useState<{ teams: number; posts: number; aiGenerations: number } | null>(null);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((data) => {
        const posts = typeof data?.posts === "number" ? data.posts : data?.postsPublished;
        const teams = data?.teams;
        const aiGenerations = data?.aiGenerations;
        if (typeof teams === "number" && typeof posts === "number" && typeof aiGenerations === "number") {
          setStats({ teams, posts, aiGenerations });
        }
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="container mx-auto grid gap-6 px-4 text-center md:grid-cols-3">
        <div>
          <p className="text-3xl font-bold">{stats.teams.toLocaleString()}+</p>
          <p className="text-sm text-muted-foreground">Teams publishing</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{(stats.posts ?? 0).toLocaleString()}+</p>
          <p className="text-sm text-muted-foreground">Posts scheduled</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{(stats.aiGenerations ?? 0).toLocaleString()}+</p>
          <p className="text-sm text-muted-foreground">AI generations</p>
        </div>
      </div>
    </section>
  );
}
