import { describe, expect, it } from "vitest";
import { normalizeVoteValue } from "@/lib/vote-utils";

describe("normalizeVoteValue", () => {
  it("treats numeric and string values consistently", () => {
    expect(normalizeVoteValue(1)).toBe(1);
    expect(normalizeVoteValue(-1)).toBe(-1);
    expect(normalizeVoteValue("1")).toBe(1);
    expect(normalizeVoteValue("-1")).toBe(-1);
  });

  it("defaults unknown values to upvote", () => {
    expect(normalizeVoteValue(null)).toBe(1);
    expect(normalizeVoteValue(undefined)).toBe(1);
  });
});
