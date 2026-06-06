import { NextResponse } from "next/server";
import { improveQuestion } from "@/lib/improve-question";

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const improved = await improveQuestion(question.trim());
    return NextResponse.json({ improved });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to improve question";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
