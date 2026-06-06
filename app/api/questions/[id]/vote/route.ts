import { NextRequest, NextResponse } from "next/server";
import { castVote, type VoteDirection } from "@/lib/votes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const voterId = body.voterId?.trim();
    const direction = body.direction as VoteDirection;

    if (!voterId) {
      return NextResponse.json(
        { error: "voterId is required" },
        { status: 400 }
      );
    }

    if (direction !== "up" && direction !== "down") {
      return NextResponse.json(
        { error: "direction must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const result = await castVote(id, voterId, direction);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to cast vote";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
