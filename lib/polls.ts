import { supabase } from "@/lib/supabase";

export async function createPoll(
  question: string,
  options: string[]
) {
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .insert([{ question }])
    .select()
    .single();

  if (pollError) throw new Error(pollError.message);

  const optionRows = options.map((option) => ({
    poll_id: poll.id,
    option_text: option,
  }));

  const { error: optionsError } = await supabase
    .from("poll_options")
    .insert(optionRows);

  if (optionsError) throw new Error(optionsError.message);

  return poll;
}

export async function getPolls() {
  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const result = [];

  for (const poll of polls ?? []) {
    const { data: options } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", poll.id);

    const optionResults = [];

    let totalVotes = 0;

    for (const option of options ?? []) {
      const { count } = await supabase
        .from("poll_votes")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("option_id", option.id);

      const votes = count ?? 0;
      totalVotes += votes;

      optionResults.push({
        ...option,
        votes,
      });
    }

    result.push({
      ...poll,
      totalVotes,
      options: optionResults,
    });
  }

  return result;
}

export async function votePoll(
  pollId: string,
  optionId: string,
  voterId: string
) {
  const { error } = await supabase
    .from("poll_votes")
    .insert([
      {
        poll_id: pollId,
        option_id: optionId,
        voter_id: voterId,
      },
    ]);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Already voted");
    }

    throw error;
  }

  return true;
}