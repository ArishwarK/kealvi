export type VoteDirection = "up" | "down";
export type UserVote = 1 | -1 | null;

export function normalizeVoteValue(value: unknown): 1 | -1 {
  return Number(value) === -1 ? -1 : 1;
}

export function directionToValue(direction: VoteDirection): 1 | -1 {
  return direction === "up" ? 1 : -1;
}
