import { supabase } from "@/lib/supabase";
import {
  getUserVotesForQuestions,
  type UserVote,
} from "@/lib/votes";

export type QuestionRow = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
  userVote: UserVote;
};

function scoreFromVotes(
  votes: { value: number }[] | null | undefined
): number {
  return (votes ?? []).reduce((sum, vote) => sum + vote.value, 0);
}

async function attachUserVotes(
  rows: Omit<QuestionRow, "userVote">[],
  voterId?: string
): Promise<QuestionRow[]> {
  if (!voterId || rows.length === 0) {
    return rows.map((row) => ({ ...row, userVote: null }));
  }

  const userVotes = await getUserVotesForQuestions(
    rows.map((row) => row.id),
    voterId
  );

  return rows.map((row) => ({
    ...row,
    userVote: userVotes[row.id] ?? null,
  }));
}

export async function getQuestionsPage(
  offset: number,
  limit: number,
  voterId?: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, votes(value)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit); // inclusive → asks for limit + 1 rows

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    author: q.author,
    votes: scoreFromVotes(q.votes),
  }));

  const hasMore = rows.length > limit; // got the extra row? there's a next page
  const questions = await attachUserVotes(rows.slice(0, limit), voterId);
  return { questions, hasMore };
}

export async function searchQuestions(
  q: string,
  limit: number,
  voterId?: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, votes(value)")
    .textSearch("body", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    author: row.author,
    votes: scoreFromVotes(row.votes),
  }));

  return attachUserVotes(rows, voterId);
}
