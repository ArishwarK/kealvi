import { NextRequest, NextResponse } from "next/server";
import { votePoll } from "@/lib/polls";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json();

    await votePoll(
      id,
      body.optionId,
      body.voterId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}