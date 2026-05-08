import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkRateLimit,
  rateLimitResponse,
  type RateLimitWindow,
} from "@/lib/rate-limit";
import { meals, type MealFoodItem } from "@/lib/schema";
import { deleteFile, upload } from "@/lib/storage";

export const maxDuration = 60;

// Each call to this endpoint hits OpenRouter's vision API and costs real
// money, so we gate it behind a sliding-window per-user rate limit. Two
// tiers prevent both bursts and marathon scraping.
const RATE_LIMITS: RateLimitWindow[] = [
  { max: 10, windowMs: 60 * 60 * 1000, label: "hour" },
  { max: 30, windowMs: 24 * 60 * 60 * 1000, label: "day" },
];

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof VALID_MEAL_TYPES)[number];

// NOTE: OpenRouter forwards JSON schemas to OpenAI in strict mode. Strict mode rules:
//   - every property must be required (use .nullable() not .optional())
//   - no min/max/length/pattern constraints
//   - no additionalProperties (Zod handles this)
const foodItemSchema = z.object({
  name: z.string().describe("Name of the food item, e.g. 'Grilled chicken breast'"),
  portion: z.string().describe("Estimated portion size, e.g. '150g' or '1 cup'"),
  calories: z.number().describe("Estimated calories for this item (non-negative integer)"),
  protein_g: z.number().nullable().describe("Protein in grams, or null if unsure"),
  carbs_g: z.number().nullable().describe("Carbohydrates in grams, or null if unsure"),
  fat_g: z.number().nullable().describe("Fat in grams, or null if unsure"),
});

const analysisSchema = z.object({
  description: z
    .string()
    .describe("Short description of the overall meal, one or two sentences"),
  food_items: z
    .array(foodItemSchema)
    .describe("Each distinct food or drink visible in the photo (empty array if not_food is true)"),
  total_calories: z.number().describe("Sum of calories across all items (non-negative integer)"),
  total_protein_g: z.number().nullable(),
  total_carbs_g: z.number().nullable(),
  total_fat_g: z.number().nullable(),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("Confidence in the calorie estimate based on image clarity"),
  not_food: z
    .boolean()
    .describe("True if the image does not appear to contain food"),
});

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

function todayStr(): string {
  return new Date().toISOString().split("T")[0] as string;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  // Reject before parsing the form / calling the model so abusers can't
  // burn AI credits. Limit applies even to malformed requests.
  const rl = await checkRateLimit(
    session.user.id,
    "meals.analyze",
    RATE_LIMITS
  );
  if (!rl.ok) {
    return rateLimitResponse(rl);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const image = formData.get("image");
  const mealTypeRaw = (formData.get("mealType") as string | null) ?? "snack";
  const mealDate = (formData.get("mealDate") as string | null) ?? todayStr();
  const userNote = (formData.get("note") as string | null) ?? "";

  if (!(image instanceof File)) {
    return Response.json({ error: "Image file is required" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_MIMES.has(image.type)) {
    return Response.json(
      { error: "Unsupported image type. Use JPG, PNG, WEBP, or GIF." },
      { status: 400 }
    );
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: `Image too large. Max ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }
  if (!VALID_MEAL_TYPES.includes(mealTypeRaw as MealType)) {
    return Response.json({ error: "Invalid mealType" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate)) {
    return Response.json({ error: "Invalid mealDate (expected YYYY-MM-DD)" }, { status: 400 });
  }

  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let imageUrl: string | null = null;
  try {
    const ext = image.name?.includes(".")
      ? image.name.slice(image.name.lastIndexOf("."))
      : `.${image.type.split("/")[1] ?? "jpg"}`;
    const filename = `${session.user.id}-${Date.now()}${ext}`;
    const result = await upload(buffer, filename, "meals", {
      maxSize: MAX_IMAGE_BYTES,
    });
    imageUrl = result.url;
  } catch (err) {
    console.error("Failed to upload meal image:", err);
  }

  const openrouter = createOpenRouter({ apiKey });
  const visionModel =
    process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o-mini";

  const promptText =
    "Analyze this meal photo and estimate calories. Identify each visible " +
    "food and drink, estimate portion sizes, and give a per-item calorie " +
    "estimate plus macros (protein, carbs, fat in grams) when you can. Sum " +
    "everything for total calories. If the image does not contain food, set " +
    "not_food to true and return an empty food_items array with total_calories 0. " +
    "Be realistic, not optimistic — assume normal preparation (oil, butter, " +
    "dressings) unless clearly otherwise. Use the user's note as additional " +
    "context if provided." +
    (userNote ? `\n\nUser note: ${userNote}` : "");

  // Best-effort cleanup of the uploaded image when we abort before persisting.
  function cleanupImage() {
    if (imageUrl) {
      deleteFile(imageUrl).catch((e) =>
        console.error("Failed to clean up orphaned meal image:", e)
      );
    }
  }

  let analysis;
  try {
    const result = await generateObject({
      model: openrouter(visionModel),
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image", image: buffer, mediaType: image.type },
          ],
        },
      ],
    });
    analysis = result.object;
  } catch (err) {
    // Surface the underlying provider error body — without it, "Provider returned error"
    // is opaque and we can't tell whether the model rejected the schema, the image, etc.
    const errAny = err as {
      message?: string;
      responseBody?: string;
      cause?: { message?: string; responseBody?: string };
      data?: unknown;
    };
    console.error("Vision analysis failed:", {
      message: errAny.message,
      responseBody: errAny.responseBody,
      causeMessage: errAny.cause?.message,
      causeBody: errAny.cause?.responseBody,
      data: errAny.data,
      model: visionModel,
    });
    Sentry.captureException(err, {
      tags: {
        route: "api/meals/analyze",
        phase: "vision",
        provider: "openrouter",
        model: visionModel,
      },
    });
    cleanupImage();
    return Response.json(
      {
        error: "Failed to analyze image. Try a clearer photo.",
        detail:
          process.env.NODE_ENV === "development"
            ? errAny.responseBody ?? errAny.cause?.responseBody ?? errAny.message
            : undefined,
      },
      { status: 502 }
    );
  }

  if (analysis.not_food || analysis.food_items.length === 0) {
    cleanupImage();
    return Response.json(
      {
        error: "No food detected in the image. Try a clearer photo of your meal.",
      },
      { status: 422 }
    );
  }

  const foodItems: MealFoodItem[] = analysis.food_items.map((item) => ({
    name: item.name,
    portion: item.portion,
    calories: Math.max(0, Math.round(item.calories)),
    ...(item.protein_g != null ? { protein_g: item.protein_g } : {}),
    ...(item.carbs_g != null ? { carbs_g: item.carbs_g } : {}),
    ...(item.fat_g != null ? { fat_g: item.fat_g } : {}),
  }));

  try {
    const [created] = await db
      .insert(meals)
      .values({
        userId: session.user.id,
        mealType: mealTypeRaw as MealType,
        mealDate,
        description: analysis.description,
        totalCalories: Math.max(0, Math.round(analysis.total_calories)),
        proteinG: analysis.total_protein_g?.toString() ?? null,
        carbsG: analysis.total_carbs_g?.toString() ?? null,
        fatG: analysis.total_fat_g?.toString() ?? null,
        foodItems,
        imageUrl,
        confidence: analysis.confidence,
      })
      .returning();

    return Response.json(created, { status: 201 });
  } catch (err) {
    console.error("Failed to save meal:", err);
    Sentry.captureException(err, {
      tags: { route: "api/meals/analyze", phase: "persist" },
    });
    cleanupImage();
    return Response.json({ error: "Failed to save meal" }, { status: 500 });
  }
}
