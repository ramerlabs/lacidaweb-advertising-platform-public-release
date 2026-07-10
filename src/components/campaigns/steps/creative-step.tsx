"use client";



import { useState } from "react";

import { ImageIcon, Loader2, Type, Upload, Video } from "lucide-react";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { ADVERTISER_AD_FORMATS, CTA_OPTIONS } from "@/lib/campaign-constants";

import { cn } from "@/lib/utils";

import type { AdvertiserCreativeFormat } from "@/types/lacidaweb";

import { CampaignAiAssistant } from "@/components/campaigns/campaign-ai-assistant";

import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";



const FORMAT_ICONS: Record<AdvertiserCreativeFormat, typeof ImageIcon> = {

  IMAGE: ImageIcon,

  TEXT_BOX: Type,

  TEXT_INLINE: Type,

  VIDEO: Video,

};



export function CreativeStep() {

  const { ads, updateAd, name, objective } = useCampaignWizardStore();

  const ad = ads[0];

  const [uploading, setUploading] = useState(false);

  const [uploadError, setUploadError] = useState("");



  function setFormat(format: AdvertiserCreativeFormat) {

    updateAd(0, {

      format,

      imageUrl: format === "IMAGE" ? ad.imageUrl : "",

      videoUrl: format === "VIDEO" ? ad.videoUrl : "",

      primaryText: format === "TEXT_INLINE" ? "" : ad.primaryText,

    });

  }



  async function onUpload(file: File) {

    setUploading(true);

    setUploadError("");

    try {

      const presign = await fetch("/api/media/presign", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          filename: file.name,

          contentType: file.type || "image/jpeg",

        }),

      });

      const urls = await presign.json();

      if (!presign.ok) throw new Error(urls.error || "Upload failed");



      const put = await fetch(urls.uploadUrl, {

        method: "PUT",

        headers: { "Content-Type": file.type || "image/jpeg" },

        body: file,

      });

      if (!put.ok) throw new Error("Storage upload failed");



      updateAd(0, { imageUrl: urls.publicUrl, videoUrl: "" });

    } catch (error) {

      setUploadError(error instanceof Error ? error.message : "Upload failed");

    } finally {

      setUploading(false);

    }

  }



  return (

    <div className="space-y-6">

      <div>

        <h2 className="text-xl font-semibold">Ad creative</h2>

        <p className="mt-1 text-sm text-muted-foreground">

          Choose your ad type first — the form adapts to text, image, or video creatives.

        </p>

      </div>

      <CampaignAiAssistant
        step="creative"
        title="AI: write creative"
        placeholder="e.g. Bold headline for eco sneakers, shop now"
        allowImage={ad.format === "IMAGE"}
        context={{
          name,
          objective: objective || undefined,
          format: ad.format,
        }}
        onApply={(suggestion) => {
          const formatRaw = String(suggestion.format || "").toUpperCase();
          const formats = new Set(["IMAGE", "TEXT_BOX", "TEXT_INLINE", "VIDEO"]);
          const patch: Partial<typeof ad> = {};
          if (formats.has(formatRaw)) {
            patch.format = formatRaw as AdvertiserCreativeFormat;
          }
          if (typeof suggestion.headline === "string") {
            patch.headline = suggestion.headline.slice(0, 80);
          }
          if (typeof suggestion.primaryText === "string") {
            patch.primaryText = suggestion.primaryText.slice(0, 500);
          }
          if (typeof suggestion.destinationUrl === "string") {
            patch.destinationUrl = suggestion.destinationUrl.slice(0, 500);
          }
          if (typeof suggestion.cta === "string") {
            patch.ctaLabel = suggestion.cta;
          }
          if (typeof suggestion.ctaLabel === "string") {
            patch.ctaLabel = suggestion.ctaLabel;
          }
          if (Object.keys(patch).length) updateAd(0, patch);
        }}
        onImageGenerated={(imageUrl) => {
          updateAd(0, { format: "IMAGE", imageUrl, videoUrl: "" });
        }}
      />

      <div className="space-y-3">

        <Label>Ad type</Label>

        <div className="grid gap-3 sm:grid-cols-2">

          {ADVERTISER_AD_FORMATS.map((option) => {

            const Icon = FORMAT_ICONS[option.id];

            const selected = ad.format === option.id;

            return (

              <button

                key={option.id}

                type="button"

                onClick={() => setFormat(option.id)}

                className={cn(

                  "rounded-xl border p-4 text-left transition-colors",

                  selected

                    ? "border-primary bg-primary/5 ring-1 ring-primary"

                    : "hover:border-primary/40 hover:bg-muted/30",

                )}

              >

                <div className="flex items-start gap-3">

                  <div

                    className={cn(

                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",

                      selected ? "bg-primary text-primary-foreground" : "bg-muted",

                    )}

                  >

                    <Icon className="h-5 w-5" />

                  </div>

                  <div>

                    <p className="font-medium">{option.label}</p>

                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>

                  </div>

                </div>

              </button>

            );

          })}

        </div>

      </div>



      <div className="grid gap-6 lg:grid-cols-2">

        <div className="space-y-4">

          <SharedFields ad={ad} updateAd={(patch) => updateAd(0, patch)} />



          {ad.format === "IMAGE" ? (

            <ImageFields

              ad={ad}

              uploading={uploading}

              uploadError={uploadError}

              onUpload={onUpload}

              updateAd={(patch) => updateAd(0, patch)}

            />

          ) : null}



          {ad.format === "TEXT_BOX" ? <TextBoxFields ad={ad} updateAd={(patch) => updateAd(0, patch)} /> : null}



          {ad.format === "TEXT_INLINE" ? (

            <TextInlineFields ad={ad} updateAd={(patch) => updateAd(0, patch)} />

          ) : null}



          {ad.format === "VIDEO" ? <VideoFields ad={ad} updateAd={(patch) => updateAd(0, patch)} /> : null}

        </div>



        <AdPreview ad={ad} />

      </div>

    </div>

  );

}



function SharedFields({

  ad,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <>

      <div className="space-y-2">

        <Label htmlFor="ad-name">Ad name</Label>

        <Input

          id="ad-name"

          value={ad.name}

          onChange={(e) => updateAd({ name: e.target.value })}

          maxLength={120}

        />

      </div>



      <div className="space-y-2">

        <Label htmlFor="destination-url">Destination URL</Label>

        <Input

          id="destination-url"

          type="url"

          placeholder="https://yoursite.com/landing"

          value={ad.destinationUrl}

          onChange={(e) => updateAd({ destinationUrl: e.target.value })}

        />

      </div>

    </>

  );

}



function ImageFields({

  ad,

  uploading,

  uploadError,

  onUpload,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  uploading: boolean;

  uploadError: string;

  onUpload: (file: File) => void;

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <>

      <div className="space-y-2">

        <Label htmlFor="headline">Headline</Label>

        <Input

          id="headline"

          placeholder="Grab attention in one line"

          value={ad.headline}

          onChange={(e) => updateAd({ headline: e.target.value })}

          maxLength={40}

        />

        <p className="text-xs text-muted-foreground">{ad.headline.length}/40</p>

      </div>



      <div className="space-y-2">

        <Label htmlFor="primary-text">Primary text</Label>

        <Textarea

          id="primary-text"

          rows={4}

          placeholder="Describe your offer and why people should click"

          value={ad.primaryText}

          onChange={(e) => updateAd({ primaryText: e.target.value })}

          maxLength={2000}

        />

      </div>



      <CtaSelect ad={ad} updateAd={updateAd} />



      <div className="space-y-2">

        <Label>Upload image</Label>

        <label

          className={cn(

            "flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors",

            ad.imageUrl ? "border-primary/30 bg-primary/5" : "hover:border-primary/40 hover:bg-muted/30",

          )}

        >

          <input

            type="file"

            accept="image/*"

            className="sr-only"

            disabled={uploading}

            onChange={(e) => {

              const file = e.target.files?.[0];

              if (file) void onUpload(file);

            }}

          />

          {uploading ? (

            <Loader2 className="h-8 w-8 animate-spin text-primary" />

          ) : ad.imageUrl ? (

            // eslint-disable-next-line @next/next/no-img-element

            <img src={ad.imageUrl} alt="Ad preview" className="max-h-40 rounded-lg object-contain" />

          ) : (

            <>

              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />

              <p className="text-sm font-medium">Click to upload image</p>

              <p className="text-xs text-muted-foreground">JPG, PNG, WebP — 1200×628 recommended</p>

            </>

          )}

        </label>

        {uploadError ? <p className="text-sm text-rose-600">{uploadError}</p> : null}

      </div>



      <div className="space-y-2">

        <Label htmlFor="image-url">Or paste image URL</Label>

        <Input

          id="image-url"

          type="url"

          placeholder="https://..."

          value={ad.imageUrl || ""}

          onChange={(e) => updateAd({ imageUrl: e.target.value })}

        />

      </div>

    </>

  );

}



function TextBoxFields({

  ad,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <>

      <div className="space-y-2">

        <Label htmlFor="headline">Headline</Label>

        <Input

          id="headline"

          placeholder="e.g. Advertise to millions of readers"

          value={ad.headline}

          onChange={(e) => updateAd({ headline: e.target.value })}

          maxLength={60}

        />

      </div>



      <div className="space-y-2">

        <Label htmlFor="primary-text">Description</Label>

        <Textarea

          id="primary-text"

          rows={4}

          placeholder="Supporting text shown inside the text box unit"

          value={ad.primaryText}

          onChange={(e) => updateAd({ primaryText: e.target.value })}

          maxLength={300}

        />

        <p className="text-xs text-muted-foreground">{ad.primaryText.length}/300</p>

      </div>



      <CtaSelect ad={ad} updateAd={updateAd} />

      <p className="text-xs text-muted-foreground">

        No image needed — this format appears as a sponsored text box on publisher sites.

      </p>

    </>

  );

}



function TextInlineFields({

  ad,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <>

      <div className="space-y-2">

        <Label htmlFor="headline">Sponsored link text</Label>

        <Input

          id="headline"

          placeholder="e.g. Grow your business with lacidaweb"

          value={ad.headline}

          onChange={(e) => updateAd({ headline: e.target.value })}

          maxLength={80}

        />

        <p className="text-xs text-muted-foreground">{ad.headline.length}/80</p>

      </div>

      <p className="text-xs text-muted-foreground">

        Short in-line format — shown as &quot;Sponsored · your link&quot; between paragraphs.

      </p>

    </>

  );

}



function VideoFields({

  ad,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <>

      <div className="space-y-2">

        <Label htmlFor="headline">Headline</Label>

        <Input

          id="headline"

          value={ad.headline}

          onChange={(e) => updateAd({ headline: e.target.value })}

          maxLength={40}

        />

      </div>



      <div className="space-y-2">

        <Label htmlFor="primary-text">Primary text</Label>

        <Textarea

          id="primary-text"

          rows={3}

          value={ad.primaryText}

          onChange={(e) => updateAd({ primaryText: e.target.value })}

          maxLength={2000}

        />

      </div>



      <CtaSelect ad={ad} updateAd={updateAd} />



      <div className="space-y-2">

        <Label htmlFor="video-url">Video URL</Label>

        <Input

          id="video-url"

          type="url"

          placeholder="https://..."

          value={ad.videoUrl || ""}

          onChange={(e) => updateAd({ videoUrl: e.target.value })}

        />

        <p className="text-xs text-muted-foreground">Direct link to MP4 or hosted video page</p>

      </div>

    </>

  );

}



function CtaSelect({

  ad,

  updateAd,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

  updateAd: (patch: Partial<typeof ad>) => void;

}) {

  return (

    <div className="space-y-2">

      <Label htmlFor="cta">Call to action</Label>

      <select

        id="cta"

        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

        value={ad.ctaLabel || "Learn More"}

        onChange={(e) => updateAd({ ctaLabel: e.target.value })}

      >

        {CTA_OPTIONS.map((cta) => (

          <option key={cta} value={cta}>

            {cta}

          </option>

        ))}

      </select>

    </div>

  );

}



function AdPreview({

  ad,

}: {

  ad: ReturnType<typeof useCampaignWizardStore.getState>["ads"][0];

}) {

  const headline = ad.headline || "Your headline";

  const primaryText = ad.primaryText || "Your description will appear here.";

  const cta = ad.ctaLabel || "Learn More";



  if (ad.format === "TEXT_INLINE") {

    return (

      <div className="rounded-xl border bg-card p-4 shadow-sm">

        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>

        <p className="text-sm text-muted-foreground">

          Sponsored ·{" "}

          <span className="font-medium text-cyan-600 underline">{headline}</span>

        </p>

      </div>

    );

  }



  if (ad.format === "TEXT_BOX") {

    return (

      <div className="rounded-xl border bg-card p-4 shadow-sm">

        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>

        <div className="rounded-lg border bg-muted/20 p-4">

          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sponsored</p>

          <p className="mt-2 font-semibold">{headline}</p>

          <p className="mt-1 text-sm text-muted-foreground">{primaryText}</p>

          <span className="mt-3 inline-block text-sm font-medium text-emerald-600">{cta} →</span>

        </div>

      </div>

    );

  }



  if (ad.format === "VIDEO") {

    return (

      <div className="rounded-xl border bg-card p-4 shadow-sm">

        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>

        <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-muted">

          <Video className="h-10 w-10 text-muted-foreground" />

        </div>

        <p className="font-semibold">{headline}</p>

        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{primaryText}</p>

        <div className="mt-3 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">

          {cta}

        </div>

      </div>

    );

  }



  return (

    <div className="rounded-xl border bg-card p-4 shadow-sm">

      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>

      {ad.imageUrl ? (

        // eslint-disable-next-line @next/next/no-img-element

        <img src={ad.imageUrl} alt="" className="mb-3 aspect-video w-full rounded-lg object-cover" />

      ) : (

        <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-muted">

          <ImageIcon className="h-8 w-8 text-muted-foreground" />

        </div>

      )}

      <p className="font-semibold">{headline}</p>

      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{primaryText}</p>

      <div className="mt-3 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">

        {cta}

      </div>

    </div>

  );

}

