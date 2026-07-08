"use client";

import { useTeam } from "@/components/dashboard/team-provider";

export function TeamSwitcher() {
  const { teams, teamId, setTeamId, loading } = useTeam();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading teams...</div>;
  }

  return (
    <select
      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      value={teamId || ""}
      onChange={(e) => setTeamId(e.target.value)}
      aria-label="Active team"
    >
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
