import { NextRequest } from "next/server";
import { availableSlotsForMonth, getLessonType } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const lessonTypeId = req.nextUrl.searchParams.get("lessonTypeId") || "";
  const month = req.nextUrl.searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "Invalid month" }, { status: 400 });
  const lesson = await getLessonType(lessonTypeId);
  if (!lesson) return Response.json({ error: "Lesson type not found" }, { status: 404 });
  const days = await availableSlotsForMonth(lesson, month);
  return Response.json({ days });
}
