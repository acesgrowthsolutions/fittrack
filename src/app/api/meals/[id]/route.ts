import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals } from "@/lib/schema";
import { deleteFile } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid meal ID" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(meals)
      .where(and(eq(meals.id, id), eq(meals.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    if (deleted.imageUrl) {
      deleteFile(deleted.imageUrl).catch((err) =>
        console.error("Failed to delete meal image:", err)
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting meal:", error);
    return Response.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
