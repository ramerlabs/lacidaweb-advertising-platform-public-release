import { z } from "zod";



const demographicsSchema = z

  .object({

    ageMin: z.number().int().min(13).max(65).optional(),

    ageMax: z.number().int().min(13).max(65).optional(),

    genders: z.array(z.enum(["male", "female", "all"])).optional(),

  })

  .optional();



const locationSchema = z.object({

  countries: z.array(z.string().min(2).max(3)).min(1, "Select at least one country"),

  regions: z.array(z.string()).optional(),

  cities: z.array(z.string()).optional(),

  radiusKm: z.number().positive().optional(),

  latitude: z.number().min(-90).max(90).optional(),

  longitude: z.number().min(-180).max(180).optional(),

});



export const audienceTargetingSchema = z.object({

  demographics: demographicsSchema,

  location: locationSchema,

  interests: z.array(z.string().min(1)).optional(),

  keywords: z.array(z.string().min(1)).optional(),

  customAudiences: z.array(z.string()).optional(),

  excludeAudiences: z.array(z.string()).optional(),

});



export const adCreativeSchema = z

  .object({

    name: z.string().min(1).max(120),

    format: z.enum(["IMAGE", "TEXT_BOX", "TEXT_INLINE", "VIDEO"]),

    headline: z.string().min(1).max(80),

    primaryText: z.string().max(2000),

    destinationUrl: z.string().url(),

    ctaLabel: z.string().min(1).max(30).default("Learn More"),

    imageUrl: z.string().url().optional(),

    videoUrl: z.string().url().optional(),

  })

  .superRefine((ad, ctx) => {

    if (ad.format === "TEXT_INLINE") {

      if (ad.headline.length > 80) {

        ctx.addIssue({

          code: z.ZodIssueCode.custom,

          message: "Headline must be 80 characters or less for in-line ads",

          path: ["headline"],

        });

      }

      return;

    }



    if (!ad.primaryText.trim()) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        message: "Primary text is required",

        path: ["primaryText"],

      });

    }



    if (ad.format === "IMAGE" && !ad.imageUrl) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        message: "Image ads require an uploaded image",

        path: ["imageUrl"],

      });

    }



    if (ad.format === "VIDEO" && !ad.videoUrl) {

      ctx.addIssue({

        code: z.ZodIssueCode.custom,

        message: "Video ads require a video URL",

        path: ["videoUrl"],

      });

    }

  });



const campaignFieldsSchema = z.object({

  name: z.string().min(1).max(120),

  objective: z.enum(["AWARENESS", "TRAFFIC", "CONVERSIONS"]),

  targeting: audienceTargetingSchema,

  budgetType: z.enum(["DAILY", "LIFETIME"]),

  budgetAmountUsd: z.number().positive().max(1_000_000),

  scheduleStart: z.string().min(1).optional(),

  scheduleEnd: z.string().min(1).optional(),

  ads: z.array(adCreativeSchema).min(1).max(10),

  platform: z.string().min(1).default("lacidaweb"),

  adAccountId: z.string().min(1).optional(),

});



function withCampaignRefinements<T extends z.ZodTypeAny>(schema: T) {

  return schema.refine(

    (data: z.infer<typeof campaignFieldsSchema>) => {

      if (!data.scheduleStart || !data.scheduleEnd) return true;

      return new Date(data.scheduleEnd) > new Date(data.scheduleStart);

    },

    { message: "End date must be after start date", path: ["scheduleEnd"] },

  );

}



export const createCampaignSchema = withCampaignRefinements(campaignFieldsSchema);



export const apiCreateCampaignSchema = withCampaignRefinements(

  campaignFieldsSchema.extend({

    teamId: z.string().min(1),

  }),

);



export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export type ApiCreateCampaignInput = z.infer<typeof apiCreateCampaignSchema>;

