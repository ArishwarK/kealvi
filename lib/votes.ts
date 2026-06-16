import { supabase } from "@/lib/supabase";
import {
  directionToValue,
  normalizeVoteValue,
  type UserVote,
  type VoteDirection,
} from "@/lib/vote-utils";

export type { UserVote, VoteDirection } from "@/lib/vote-utils";

const isDev = process.env.NODE_ENV !== "production";
const VOTE_PAGE_SIZE = 1000;

function logVote(event: string, details: Record<string, unknown>) {
  if (isDev) {
    console.debug("[vote]", event, details);
  }
}

async function fetchVoteRows(questionIds: string[]) {
  const rows: { question_id: string; value: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("votes")
      .select("question_id, value")
      .in("question_id", questionIds)
      .range(from, from + VOTE_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = data ?? [];
    rows.push(
      ...batch.map((row) => ({
        question_id: row.question_id as string,
        value: normalizeVoteValue(row.value),
      }))
    );

    if (batch.length < VOTE_PAGE_SIZE) break;
    from += VOTE_PAGE_SIZE;
  }

  return rows;
}

function scoresFromRows(
  questionIds: string[],
  rows: { question_id: string; value: number }[]
) {
  const scores: Record<string, number> = {};
  for (const id of questionIds) scores[id] = 0;
  for (const row of rows) {
    scores[row.question_id] = (scores[row.question_id] ?? 0) + row.value;
  }
  return scores;
}

export async function getQuestionScores(
  questionIds: string[]
): Promise<Record<string, number>> {
  const scores: Record<string, number> = {};
  for (const id of questionIds) scores[id] = 0;
  if (questionIds.length === 0) return scores;

  const { data, error } = await supabase.rpc("get_question_scores", {
    question_ids: questionIds,
  });

  if (!error && data) {
    for (const row of data as { question_id: string; score: number }[]) {
      scores[row.question_id] = Number(row.score);
    }
    return scores;
  }

  logVote("scores:fallback", { reason: error?.message });
  const rows = await fetchVoteRows(questionIds);
  return scoresFromRows(questionIds, rows);
}

export async function getQuestionScore(questionId: string): Promise<number> {
  const scores = await getQuestionScores([questionId]);
  return Math.max(scores[questionId] ?? 0, 0);
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

async function castVoteFallback(
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

  if (!existing) {
    // No existing vote → insert new vote
    const { error } = await supabase.from("votes").insert({
      question_id: questionId,
      voter_id: voterId,
      value: requested,
    });
    if (error) throw new Error(error.message);
  } else {
    // Already voted → always remove existing vote (no flip)
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  }

  const [score, userVote] = await Promise.all([
    getQuestionScore(questionId),
    getUserVote(questionId, voterId),
  ]);

  return { score, userVote };
}

export async function castVote(
  questionId: string,
  voterId: string,
  direction: VoteDirection
): Promise<{ score: number; userVote: UserVote }> {
  const requested = directionToValue(direction);

  logVote("cast:start", { questionId, voterId, direction, requested });

  const { data, error } = await supabase.rpc("cast_question_vote", {
    p_question_id: questionId,
    p_voter_id: voterId,
    p_value: requested,
  });

  if (!error && data && typeof data === "object") {
    const payload = data as { score?: number | string; userVote?: number | null };
    const result = {
      score: Number(payload.score ?? 0),
      userVote:
        payload.userVote == null
          ? null
          : normalizeVoteValue(payload.userVote),
    };
    logVote("cast:done", { questionId, voterId, ...result, via: "rpc" });
    return result;
  }

  logVote("cast:fallback", { questionId, reason: error?.message });
  const result = await castVoteFallback(questionId, voterId, direction);
  logVote("cast:done", { questionId, voterId, ...result, via: "fallback" });
  return result;
}
