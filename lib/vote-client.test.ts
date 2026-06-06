import { describe, expect, it } from "vitest";
import {
  applyPinnedVotes,
  applyVoteOptimistic,
  mergeQuestionList,
} from "@/lib/vote-client";

describe("applyVoteOptimistic", () => {
  it("adds an upvote from neutral", () => {
    expect(applyVoteOptimistic({ votes: 2, userVote: null }, "up")).toEqual({
      votes: 3,
      userVote: 1,
    });
  });

  it("adds a downvote from neutral", () => {
    expect(applyVoteOptimistic({ votes: 2, userVote: null }, "down")).toEqual({
      votes: 1,
      userVote: -1,
    });
  });

  it("removes an upvote when clicked again", () => {
    expect(applyVoteOptimistic({ votes: 3, userVote: 1 }, "up")).toEqual({
      votes: 2,
      userVote: null,
    });
  });

  it("removes a downvote when clicked again", () => {
    expect(applyVoteOptimistic({ votes: 1, userVote: -1 }, "down")).toEqual({
      votes: 2,
      userVote: null,
    });
  });

  it("flips upvote to downvote", () => {
    expect(applyVoteOptimistic({ votes: 4, userVote: 1 }, "down")).toEqual({
      votes: 2,
      userVote: -1,
    });
  });

  it("flips downvote to upvote", () => {
    expect(applyVoteOptimistic({ votes: 0, userVote: -1 }, "up")).toEqual({
      votes: 2,
      userVote: 1,
    });
  });
});

describe("mergeQuestionList", () => {
  const q = (id: string, votes: number, userVote: 1 | -1 | null = null) => ({
    id,
    body: id,
    votes,
    userVote,
  });

  it("updates scores for overlapping questions without truncating loaded rows", () => {
    const prev = [q("a", 1), q("b", 2), q("c", 3)];
    const incoming = [q("a", 5, 1), q("b", 4, -1)];

    expect(mergeQuestionList(prev, incoming)).toEqual([
      q("a", 5, 1),
      q("b", 4, -1),
      q("c", 3),
    ]);
  });

  it("prepends brand-new questions from the server", () => {
    const prev = [q("a", 1)];
    const incoming = [q("new", 0), q("a", 2)];

    expect(mergeQuestionList(prev, incoming)).toEqual([q("new", 0), q("a", 2)]);
  });
});

describe("applyPinnedVotes", () => {
  it("keeps authoritative vote results over stale poll data", () => {
    const questions = [
      { id: "a", votes: 1, userVote: null as const },
      { id: "b", votes: 0, userVote: null as const },
    ];
    const pinned = new Map([
      ["a", { votes: 3, userVote: 1 as const }],
    ]);

    expect(applyPinnedVotes(questions, pinned)).toEqual([
      { id: "a", votes: 3, userVote: 1 },
      { id: "b", votes: 0, userVote: null },
    ]);
  });
});

describe("vote sequence integrity", () => {
  it("returns to the original score after vote and unvote", () => {
    let state = { votes: 7, userVote: null as 1 | -1 | null };
    state = applyVoteOptimistic(state, "up");
    state = applyVoteOptimistic(state, "up");
    expect(state).toEqual({ votes: 7, userVote: null });
  });

  it("does not double-count when flipping directions", () => {
    let state = { votes: 5, userVote: null as 1 | -1 | null };
    state = applyVoteOptimistic(state, "up"); // 6, +1
    state = applyVoteOptimistic(state, "down"); // 4, -1 (net -2 from flip)
    state = applyVoteOptimistic(state, "up"); // 6, +1
    expect(state).toEqual({ votes: 6, userVote: 1 });
  });
});
