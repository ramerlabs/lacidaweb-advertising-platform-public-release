"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type TeamContextValue = {
  teams: Team[];
  teamId: string | null;
  setTeamId: (id: string) => void;
  refreshTeams: () => Promise<void>;
  loading: boolean;
};

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTeams = async () => {
    const res = await fetch("/api/teams");
    if (!res.ok) return;
    const data = await res.json();
    setTeams(data.teams || []);
    setTeamIdState((current) => {
      if (current && data.teams?.some((t: Team) => t.id === current)) return current;
      const stored = typeof window !== "undefined" ? localStorage.getItem("activeTeamId") : null;
      if (stored && data.teams?.some((t: Team) => t.id === stored)) return stored;
      return data.teams?.[0]?.id ?? null;
    });
  };

  useEffect(() => {
    refreshTeams().finally(() => setLoading(false));
  }, []);

  const setTeamId = (id: string) => {
    setTeamIdState(id);
    localStorage.setItem("activeTeamId", id);
  };

  const value = useMemo(
    () => ({ teams, teamId, setTeamId, refreshTeams, loading }),
    [teams, teamId, loading],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
