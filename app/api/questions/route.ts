import { supabase } from "@/lib/supabase";
import {
  getQuestionsByIds,
  getQuestionsPage,
  searchQuestions,
} from "@/lib/questions";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const voterId = searchParams.get("voterId")?.trim() || undefined;
  const idsParam = searchParams.get("ids")?.trim();

  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const questions = await getQuestionsByIds(ids, voterId);
    return Response.json({ questions, hasMore: false });
  }

  if (q) {
    const questions = await searchQuestions(q, PAGE_SIZE, voterId);
    return Response.json({ questions, hasMore: false });
  }

  const offset = Number(searchParams.get("offset") ?? 0);
  const { questions, hasMore } = await getQuestionsPage(
    offset,
    PAGE_SIZE,
    voterId
  );
  return Response.json({ questions, hasMore });
}

export async function POST(req: Request) {
  const { body, author } = await req.json();

  const { data, error } = await supabase
    .from("questions")
    .insert({ body, author })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
