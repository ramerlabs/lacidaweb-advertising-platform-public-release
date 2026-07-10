import { prisma } from "@/lib/prisma";
import { applyProfitMargin, imageCostInTokens, usdToCents } from "@/lib/ai-pricing";
import { getAiSettings, getOpenAiApiKey } from "@/lib/ai-settings";
import { getTeamBusinessContext } from "@/lib/team-business";
import { createLocalUploadSlot } from "@/lib/local-media";
import { maybeNotifyLowTokens } from "@/services/client-notify";

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

async function callOpenAiText(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
) {
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
      max_tokens: maxTokens,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI request failed");
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("No text returned from OpenAI");
  return {
    text,
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
  };
}

async function billTextUsage(
  teamId: string,
  settings: Awaited<ReturnType<typeof getAiSettings>>,
  promptTokens: number,
  completionTokens: number,
  meta: { type: string },
) {
  const totalTokens = promptTokens + completionTokens;
  const providerCostUsd =
    (promptTokens * settings.aiTextInputCostPerMillion) / 1_000_000 +
    (completionTokens * settings.aiTextOutputCostPerMillion) / 1_000_000;
  const billing = await chargeTeamTokens(
    teamId,
    totalTokens,
    providerCostUsd,
    settings.aiProfitMarginPercent,
    { type: meta.type, promptTokens, completionTokens },
  );
  await maybeNotifyLowTokens(teamId, billing.tokenBalance);
  return { ...billing, providerCostUsd, promptTokens, completionTokens };
}

function buildTextSystemPrompt(input: {
  tone?: string;
  platform?: string;
  businessContext: string;
  brandVoice?: string | null;
}) {
  const tone = input.tone || input.brandVoice || "professional and friendly";
  const lines = [
    "You write concise, engaging social media post captions.",
    `Tone: ${tone}.`,
    `Platform: ${input.platform || "general social media"}.`,
    "Return only the caption text, no quotes unless requested.",
  ];
  if (input.businessContext) {
    lines.push("", "Business context (stay on-brand):", input.businessContext);
  }
  return lines.join("\n");
}

function buildImagePrompt(userPrompt: string, businessContext: string) {
  if (!businessContext) return userPrompt;
  return `${userPrompt}\n\nBrand context: ${businessContext.replace(/\n/g, "; ")}`;
}

function resolveImagePrompt(input: string, businessContext: string): string {
  const trimmed = input.trim();
  if (trimmed) return buildImagePrompt(trimmed, businessContext);
  if (businessContext) {
    return buildImagePrompt(
      `Professional social media image for: ${businessContext.slice(0, 300).replace(/\n/g, "; ")}`,
      businessContext,
    );
  }
  return "Professional, eye-catching social media marketing image";
}

function resolveTextPrompt(input: string, businessContext: string): string {
  const trimmed = input.trim();
  if (trimmed) return trimmed;
  if (businessContext) {
    return `Write an engaging social media post for this business:\n${businessContext.slice(0, 500)}`;
  }
  return "Write an engaging, on-brand social media post";
}

async function generateOpenAiImageBuffer(apiKey: string, prompt: string): Promise<Buffer> {
  const attempts: Array<{ model: string; quality?: string }> = [
    { model: "gpt-image-1", quality: "medium" },
    { model: "dall-e-3" },
  ];

  let lastError = "OpenAI image generation failed";

  for (const attempt of attempts) {
    const body: Record<string, unknown> = {
      model: attempt.model,
      prompt,
      size: "1024x1024",
      n: 1,
    };
    if (attempt.quality) body.quality = attempt.quality;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      lastError = data.error?.message || `Image generation failed (${attempt.model})`;
      continue;
    }

    const b64 = data.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, "base64");

    const tempUrl = data.data?.[0]?.url;
    if (tempUrl) {
      const imageRes = await fetch(tempUrl);
      if (!imageRes.ok) throw new Error("Failed to download generated image");
      return Buffer.from(await imageRes.arrayBuffer());
    }

    lastError = "No image data returned from OpenAI";
  }

  throw new Error(lastError);
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

  const { context, profile } = await getTeamBusinessContext(input.teamId);

  const systemPrompt = buildTextSystemPrompt({
    tone: input.tone,
    platform: input.platform,
    businessContext: context,
    brandVoice: profile.brandVoice,
  });
  const userPrompt = resolveTextPrompt(input.prompt, context);

  const { text, promptTokens, completionTokens } = await callOpenAiText(
    apiKey,
    systemPrompt,
    userPrompt,
  );
  const billing = await billTextUsage(input.teamId, settings, promptTokens, completionTokens, {
    type: "text",
  });
  return { text, ...billing };
}

export async function transformPostText(input: {
  teamId: string;
  content: string;
  mode: "shorten" | "hashtags" | "regenerate";
  tone?: string;
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

  const { context, profile } = await getTeamBusinessContext(input.teamId);
  const content = input.content.trim();
  if (!content) throw new Error("Content is required");

  const modePrompts: Record<typeof input.mode, string> = {
    shorten: "Shorten this social post caption while keeping the core message. Return only the caption.",
    hashtags: "Add 5-8 relevant hashtags to the end of this caption. Return the full caption with hashtags.",
    regenerate: "Rewrite this social post caption to be fresher and more engaging. Return only the caption.",
  };

  const tone = input.tone || profile.brandVoice || "professional";
  const systemParts = [`${modePrompts[input.mode]} Tone: ${tone}.`];
  if (context) {
    systemParts.push("", "Business context:", context);
  }

  const { text, promptTokens, completionTokens } = await callOpenAiText(
    apiKey,
    systemParts.join("\n"),
    content,
    400,
  );
  const billing = await billTextUsage(input.teamId, settings, promptTokens, completionTokens, {
    type: input.mode,
  });
  return { text, ...billing };
}

export async function generatePostImage(input: { teamId: string; prompt: string }) {
  const settings = await getAiSettings();
  if (!settings.aiEnabled) throw new Error("AI generation is disabled by the platform admin");
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) throw new Error("OpenAI is not configured");

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { aiEnabled: true, aiTokenBalance: true },
  });
  if (!team?.aiEnabled) throw new Error("Enable AI in your workspace settings first");

  const { context } = await getTeamBusinessContext(input.teamId);
  const userPrompt = resolveImagePrompt(input.prompt, context);

  const clientInputPerMillion = settings.clientPricing.textInputPerMillionUsd;
  const clientImageUsd = settings.clientPricing.imageUsd;
  const tokensToDeduct = imageCostInTokens(clientImageUsd, clientInputPerMillion);

  if (team.aiTokenBalance < tokensToDeduct) {
    throw new Error(
      `Insufficient AI tokens. Need ${tokensToDeduct.toLocaleString()}, have ${team.aiTokenBalance.toLocaleString()}`,
    );
  }

  const buffer = await generateOpenAiImageBuffer(apiKey, userPrompt);

  const slot = await createLocalUploadSlot({
    filename: `ai-${Date.now()}.png`,
    contentType: "image/png",
  });

  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const uploadUrl = slot.uploadUrl.startsWith("/")
    ? `${baseUrl.replace(/\/$/, "")}${slot.uploadUrl}`
    : slot.uploadUrl;

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: new Uint8Array(buffer),
  });
  if (!put.ok) throw new Error("Failed to store generated image");

  const billing = await chargeTeamTokens(
    input.teamId,
    tokensToDeduct,
    settings.aiImageCostUsd,
    settings.aiProfitMarginPercent,
    { type: "image" },
  );

  await maybeNotifyLowTokens(input.teamId, billing.tokenBalance);

  return { imageUrl: slot.publicUrl, ...billing, providerCostUsd: settings.aiImageCostUsd };
}

export async function generateAdCreative(input: {
  teamId: string;
  prompt: string;
  goal?: string;
  platform?: string;
  tone?: string;
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

  const { context, profile } = await getTeamBusinessContext(input.teamId);
  const userPrompt = resolveTextPrompt(input.prompt, context);

  const goal = input.goal || "engagement";
  const platform = input.platform || "Meta (Facebook/Instagram)";
  const tone = input.tone || profile.brandVoice || "professional and persuasive";

  const systemParts = [
    "You write paid social ad copy.",
    `Platform: ${platform}. Campaign goal: ${goal}. Tone: ${tone}.`,
    "Return ONLY valid JSON with keys primaryText and headline.",
    "primaryText: main ad copy, max 125 characters.",
    "headline: short hook, max 40 characters.",
    "No markdown, no extra keys.",
  ];
  if (context) {
    systemParts.push("", "Business context:", context);
  }

  const { text, promptTokens, completionTokens } = await callOpenAiText(
    apiKey,
    systemParts.join("\n"),
    userPrompt,
    350,
  );

  let primaryText = "";
  let headline = "";
  try {
    const parsed = JSON.parse(text) as { primaryText?: string; headline?: string };
    primaryText = String(parsed.primaryText || "").slice(0, 125);
    headline = String(parsed.headline || "").slice(0, 40);
  } catch {
    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    primaryText = (lines[0] || text).slice(0, 125);
    headline = (lines[1] || lines[0] || "Learn more").slice(0, 40);
  }

  const billing = await billTextUsage(input.teamId, settings, promptTokens, completionTokens, {
    type: "ad_creative",
  });

  return { primaryText, headline, ...billing };
}
