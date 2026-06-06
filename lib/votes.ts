import { supabase } from "@/lib/supabase";
import {
  directionToValue,
  normalizeVoteValue,
  type UserVote,
  type VoteDirection,
} from "@/lib/vote-utils";

export type { UserVote, VoteDirection } from "@/lib/vote-utils";

const isDev = process.env.NODE_ENV !== "production";

function logVote(event: string, details: Record<string, unknown>) {
  if (isDev) {
    console.debug("[vote]", event, details);
  }
}

export async function getQuestionScores(
  questionIds: string[]
): Promise<Record<string, number>> {
  const scores: Record<string, number> = {};
  for (const id of questionIds) scores[id] = 0;
  if (questionIds.length === 0) return scores;

  const { data, error } = await supabase
    .from("votes")
    .select("question_id, value")
    .in("question_id", questionIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = row.question_id as string;
    scores[id] = (scores[id] ?? 0) + normalizeVoteValue(row.value);
  }

  return scores;
}

export async function getQuestionScore(questionId: string): Promise<number> {
  const scores = await getQuestionScores([questionId]);
  return scores[questionId] ?? 0;
}

export async function getUserVote(
  questionId: string,
  voterId: string
): Promise<UserVote> {
  const { data, error } = await supabase
    .from("votes")
    .select("value")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return normalizeVoteValue(data.value);
}

export async function getUserVotesForQuestions(
  questionIds: string[],
  voterId: string
): Promise<Record<string, UserVote>> {
  if (questionIds.length === 0) return {};

  const { data, error } = await supabase
    .from("votes")
    .select("question_id, value")
    .in("question_id", questionIds)
    .eq("voter_id", voterId);

  if (error) throw new Error(error.message);

  const result: Record<string, UserVote> = {};
  for (const row of data ?? []) {
    result[row.question_id] = normalizeVoteValue(row.value);
  }
  return result;
}

export async function castVote(
  questionId: string,
  voterId: string,
  direction: VoteDirection
): Promise<{ score: number; userVote: UserVote }> {
  const requested = directionToValue(direction);

  const { data: existing, error: fetchError } = await supabase
    .from("votes")
    .select("id, value")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  const existingValue = existing
    ? normalizeVoteValue(existing.value)
    : null;

  logVote("cast:start", {
    questionId,
    voterId,
    direction,
    existingValue,
  });

  if (!existing) {
    const { error } = await supabase.from("votes").insert({
      question_id: questionId,
      voter_id: voterId,
      value: requested,
    });
    if (error) throw new Error(error.message);
  } else if (existingValue === requested) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("votes")
      .update({ value: requested })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  }

  const [score, userVote] = await Promise.all([
    getQuestionScore(questionId),
    getUserVote(questionId, voterId),
  ]);

  logVote("cast:done", { questionId, voterId, score, userVote });

  return { score, userVote };
}
