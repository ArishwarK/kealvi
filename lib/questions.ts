import { supabase } from "@/lib/supabase";
import {
  getQuestionScores,
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

async function attachScoresAndUserVotes(
  rows: Omit<QuestionRow, "votes" | "userVote">[],
  voterId?: string
): Promise<QuestionRow[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [scores, userVotes] = await Promise.all([
    getQuestionScores(ids),
    voterId
      ? getUserVotesForQuestions(ids, voterId)
      : Promise.resolve({} as Record<string, UserVote>),
  ]);

  return rows.map((row) => ({
    ...row,
    votes: scores[row.id] ?? 0,
    userVote: voterId ? (userVotes[row.id] ?? null) : null,
  }));
}

export async function getQuestionsPage(
  offset: number,
  limit: number,
  voterId?: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit); // inclusive → asks for limit + 1 rows

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    author: q.author,
  }));

  const hasMore = rows.length > limit;
  const questions = await attachScoresAndUserVotes(
    rows.slice(0, limit),
    voterId
  );
  return { questions, hasMore };
}

export async function searchQuestions(
  q: string,
  limit: number,
  voterId?: string
) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at")
    .textSearch("body", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    body: row.body,
    author: row.author,
  }));

  return attachScoresAndUserVotes(rows, voterId);
}

export async function getQuestionsByIds(ids: string[], voterId?: string) {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at")
    .in("id", ids);

  if (error) throw new Error(error.message);

  const byId = new Map(
    (data ?? []).map((row) => [
      row.id,
      { id: row.id, body: row.body, author: row.author },
    ])
  );

  const ordered = ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined);

  return attachScoresAndUserVotes(ordered, voterId);
}
