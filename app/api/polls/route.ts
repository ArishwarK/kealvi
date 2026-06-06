import { NextRequest, NextResponse } from "next/server";
import { createPoll, getPolls } from "@/lib/polls";

export async function GET() {
  try {
    const polls = await getPolls();

    return NextResponse.json(polls);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const question = body.question;
    const options = body.options;

    const poll = await createPoll(
      question,
      options
    );

    return NextResponse.json(poll);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}