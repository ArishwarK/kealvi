import { supabase } from "@/lib/supabase";

export type VoteDirection = "up" | "down";
export type UserVote = 1 | -1 | null;

function directionToValue(direction: VoteDirection): 1 | -1 {
  return direction === "up" ? 1 : -1;
}

export async function getQuestionScore(questionId: string): Promise<number> {
  const { data, error } = await supabase
    .from("votes")
    .select("value")
    .eq("question_id", questionId);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => sum + row.value, 0);
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

  return data.value === -1 ? -1 : 1;
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
    result[row.question_id] = row.value === -1 ? -1 : 1;
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

  if (!existing) {
    const { error } = await supabase.from("votes").insert({
      question_id: questionId,
      voter_id: voterId,
      value: requested,
    });
    if (error) throw new Error(error.message);
  } else if (existing.value === requested) {
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

  return { score, userVote };
}
