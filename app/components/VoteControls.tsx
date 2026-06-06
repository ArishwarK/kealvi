"use client";

import type { UserVote } from "@/lib/vote-utils";
import type { VoteDirection } from "@/lib/vote-utils";

type VoteControlsProps = {
  votes: number;
  userVote: UserVote;
  disabled?: boolean;
  onVote: (direction: VoteDirection) => void;
};

export default function VoteControls({
  votes,
  userVote,
  disabled,
  onVote,
}: VoteControlsProps) {
  return (
    <div className="vote-stack" aria-label="Vote on this question">
      <button
        type="button"
        onClick={() => onVote("up")}
        disabled={disabled}
        aria-label="Upvote"
        aria-pressed={userVote === 1}
        className={`vote-btn ${userVote === 1 ? "vote-btn-active-up" : ""}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 3.5 3.5 11h4v5.5h5V11h4L10 3.5z" />
        </svg>
      </button>

      <span
        className={`vote-count ${
          votes > 0 ? "text-primary-dark" : votes < 0 ? "text-danger" : ""
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {votes}
      </span>

      <button
        type="button"
        onClick={() => onVote("down")}
        disabled={disabled}
        aria-label="Downvote"
        aria-pressed={userVote === -1}
        className={`vote-btn ${userVote === -1 ? "vote-btn-active-down" : ""}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 16.5 16.5 9h-4V3.5H7.5V9h-4L10 16.5z" />
        </svg>
      </button>
    </div>
  );
}
