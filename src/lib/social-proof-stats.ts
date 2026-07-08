/** Marketing baselines shown on the landing page; real usage is added on top. */
export const SOCIAL_PROOF_BASELINES = {
  teams: 500,
  posts: 10_000,
  aiGenerations: 2_500,
} as const;

export function displaySocialProofStats(real: {
  teams: number;
  posts: number;
  aiGenerations: number;
}) {
  return {
    teams: SOCIAL_PROOF_BASELINES.teams + Math.max(real.teams, 0),
    posts: SOCIAL_PROOF_BASELINES.posts + Math.max(real.posts, 0),
    aiGenerations: SOCIAL_PROOF_BASELINES.aiGenerations + Math.max(real.aiGenerations, 0),
  };
}
