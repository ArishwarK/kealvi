import type { UserVote } from "@/lib/vote-utils";
import type { VoteDirection } from "@/lib/vote-utils";

export type { VoteDirection, UserVote } from "@/lib/vote-utils";

export type QuestionVoteState = {
  votes: number;
  userVote: UserVote;
};

/** Client-side optimistic vote transition (mirrors server toggle/flip rules). */
export function applyVoteOptimistic(
  question: QuestionVoteState,
  direction: VoteDirection
): QuestionVoteState {
  const requested = direction === "up" ? 1 : -1;
  const { userVote, votes } = question;

  if (userVote === null) {
    return { votes: votes + requested, userVote: requested };
  }

  if (userVote === requested) {
    return { votes: votes - requested, userVote: null };
  }

  return {
    votes: votes - userVote + requested,
    userVote: requested,
  };
}

/** Merge a poll/page refresh into the current list without dropping loaded rows. */
export function mergeQuestionList<
  T extends { id: string; votes: number; userVote: UserVote },
>(prev: T[], incoming: T[]): T[] {
  if (incoming.length === 0) return prev;

  const incomingById = new Map(incoming.map((q) => [q.id, q]));
  const prevIds = new Set(prev.map((q) => q.id));
  const prepended = incoming.filter((q) => !prevIds.has(q.id));

  const merged = prev.map((q) => {
    const fresh = incomingById.get(q.id);
    if (!fresh) return q;
    return { ...q, votes: fresh.votes, userVote: fresh.userVote };
  });

  return [...prepended, ...merged];
}

/** Pin authoritative vote results over a poll refresh for recently voted questions. */
export function applyPinnedVotes<
  T extends { id: string; votes: number; userVote: UserVote },
>(
  questions: T[],
  pinned: Map<string, { votes: number; userVote: UserVote }>
): T[] {
  if (pinned.size === 0) return questions;

  return questions.map((q) => {
    const override = pinned.get(q.id);
    return override
      ? { ...q, votes: override.votes, userVote: override.userVote }
      : q;
  });
}
