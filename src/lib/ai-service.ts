import { prisma } from "@/lib/prisma";
import { applyProfitMargin, imageCostInTokens, usdToCents } from "@/lib/ai-pricing";
import { getAiSettings, getOpenAiApiKey } from "@/lib/ai-settings";
import { getMediaPresignedUrl } from "@/services/publisher";

async function chargeTeamTokens(
  teamId: string,
  tokensToDeduct: number,
  providerCostUsd: number,
  marginPercent: number,
  meta: {
    type: string;
    promptTokens?: number;
    completionTokens?: number;
  },
) {
  const chargedCents = usdToCents(applyProfitMargin(providerCostUsd, marginPercent));
  const providerCostCents = usdToCents(providerCostUsd);

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { aiTokenBalance: true },
  });
  if (!team) throw new Error("Team not found");
  if (team.aiTokenBalance < tokensToDeduct) {
    throw new Error(
      `Insufficient AI tokens. Need ${tokensToDeduct.toLocaleString()}, have ${team.aiTokenBalance.toLocaleString()}`,
    );
  }

  await prisma.$transaction([
    prisma.team.update({
      where: { id: teamId },
      data: { aiTokenBalance: { decrement: tokensToDeduct } },
    }),
    prisma.aiUsageLog.create({
      data: {
        teamId,
        type: meta.type,
        providerCostCents,
        chargedCents,
        tokensUsed: tokensToDeduct,
        promptTokens: meta.promptTokens,
        completionTokens: meta.completionTokens,
      },
    }),
  ]);

  return {
    tokensUsed: tokensToDeduct,
    tokenBalance: team.aiTokenBalance - tokensToDeduct,
    chargedCents,
  };
}

export async function generatePostText(input: {
  teamId: string;
  prompt: string;
  tone?: string;
  platform?: string;
}) {
  const settings = await getAiSettings();
  if (!settings.aiEnabled) throw new Error("AI generation is disabled by the platform admin");
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured");

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { aiEnabled: true },
  });
  if (!team?.aiEnabled) throw new Error("Enable AI in your workspace settings first");

  const systemPrompt = `You write concise, engaging social media post captions. Tone: ${input.tone || "professional and friendly"}. Platform: ${input.platform || "general social media"}. Return only the caption text, no quotes or hashtags unless requested.`;
  const userPrompt = input.prompt.trim();
  if (!userPrompt) throw new Error("Prompt is required");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "OpenAI text generation failed");
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No text returned from OpenAI");

  const promptTokens = data.usage?.prompt_tokens || 0;
  const completionTokens = data.usage?.completion_tokens || 0;
  const totalTokens = promptTokens + completionTokens;
  const providerCostUsd =
    (promptTokens * settings.aiTextInputCostPerMillion) / 1_000_000 +
    (completionTokens * settings.aiTextOutputCostPerMillion) / 1_000_000;

  const billing = await chargeTeamTokens(
    input.teamId,
    totalTokens,
    providerCostUsd,
    settings.aiProfitMarginPercent,
    { type: "text", promptTokens, completionTokens },
  );

  return { text, ...billing, providerCostUsd, promptTokens, completionTokens };
}

export async function generatePostImage(input: { teamId: string; prompt: string }) {
  const settings = await getAiSettings();
  if (!settings.aiEnabled) throw new Error("AI generation is disabled by the platform admin");
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured");

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { aiEnabled: true },
  });
  if (!team?.aiEnabled) throw new Error("Enable AI in your workspace settings first");

  const userPrompt = input.prompt.trim();
  if (!userPrompt) throw new Error("Image prompt is required");

  const clientInputPerMillion = settings.clientPricing.textInputPerMillionUsd;
  const tokensToDeduct = imageCostInTokens(settings.aiImageCostUsd, clientInputPerMillion);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: userPrompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "OpenAI image generation failed");
  }

  const tempUrl = data.data?.[0]?.url;
  if (!tempUrl) throw new Error("No image URL returned from OpenAI");

  const imageRes = await fetch(tempUrl);
  if (!imageRes.ok) throw new Error("Failed to download generated image");
  const buffer = Buffer.from(await imageRes.arrayBuffer());

  const presign = await getMediaPresignedUrl({
    filename: `ai-${Date.now()}.png`,
    contentType: "image/png",
  });

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: buffer,
  });
  if (!put.ok) throw new Error("Failed to store generated image");

  const billing = await chargeTeamTokens(
    input.teamId,
    tokensToDeduct,
    settings.aiImageCostUsd,
    settings.aiProfitMarginPercent,
    { type: "image" },
  );

  return { imageUrl: presign.publicUrl, ...billing, providerCostUsd: settings.aiImageCostUsd };
}
