"use client";

import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
  userVote: 1 | -1 | null;
};

type VoteDirection = "up" | "down";

function applyVoteOptimistic(
  question: Question,
  direction: VoteDirection
): Question {
  const requested = direction === "up" ? 1 : -1;
  const { userVote, votes } = question;

  if (userVote === null) {
    return { ...question, votes: votes + requested, userVote: requested };
  }

  if (userVote === requested) {
    return { ...question, votes: votes - requested, userVote: null };
  }

  return {
    ...question,
    votes: votes - userVote + requested,
    userVote: requested,
  };
}

function questionsUrl(query: string, voterId?: string, offset?: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (offset !== undefined) params.set("offset", String(offset));
  if (voterId) params.set("voterId", voterId);
  const qs = params.toString();
  return qs ? `/api/questions?${qs}` : "/api/questions";
}

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(() =>
    initialQuestions.map((q) => ({
      ...q,
      userVote: q.userVote ?? null,
    }))
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [voterId, setVoterId] = useState<string | null>(null);

  useEffect(() => {
    setVoterId(getVoterId());
    setHydrated(true);
  }, []);

  async function fetchQuestions(url: string) {
    const res = await fetch(url);
    const data = await res.json();
    setQuestions(
      (data.questions ?? []).map((q: Question) => ({
        ...q,
        userVote: q.userVote ?? null,
      }))
    );
    setHasMore(data.hasMore ?? false);
  }

  // Auto refresh every 2 seconds
  useEffect(() => {
    if (!voterId) return;

    const interval = setInterval(() => {
      fetchQuestions(questionsUrl(query, voterId));
    }, 2000);

    return () => clearInterval(interval);
  }, [query, voterId]);

  // Search debounce
  useEffect(() => {
    if (!voterId) return;

    const id = setTimeout(() => {
      fetchQuestions(questionsUrl(query, voterId));
    }, 300);

    return () => clearTimeout(id);
  }, [query, voterId]);

  async function improveDraft() {
    if (!draft.trim() || improving) return;

    setImproving(true);
    setImproveError(null);

    try {
      const res = await fetch("/api/improve-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: draft }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to improve question");
      }

      setDraft(data.improved);
    } catch (error) {
      setImproveError(
        error instanceof Error ? error.message : "Failed to improve question"
      );
    } finally {
      setImproving(false);
    }
  }

  async function submit() {
    if (!draft.trim()) return;

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: draft,
      }),
    });

    const created = await res.json();

    setQuestions((qs) => [
      { ...created, votes: 0, userVote: null },
      ...qs,
    ]);

    setDraft("");
  }

  async function vote(id: string, direction: VoteDirection) {
    if (!voterId) return;

    let previous: Question | undefined;

    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) return q;
        previous = q;
        return applyVoteOptimistic(q, direction);
      })
    );

    const res = await fetch(`/api/questions/${id}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voterId,
        direction,
      }),
    });

    if (!res.ok) {
      if (previous) {
        setQuestions((qs) =>
          qs.map((q) => (q.id === id ? previous! : q))
        );
      }
      return;
    }

    const data = await res.json();
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? { ...q, votes: data.score, userVote: data.userVote }
          : q
      )
    );
  }

  async function loadMore() {
    setLoading(true);

    const res = await fetch(
      questionsUrl("", voterId ?? undefined, questions.length)
    );

    const data = await res.json();

    setQuestions((qs) => [
      ...qs,
      ...(data.questions ?? []).map((q: Question) => ({
        ...q,
        userVote: q.userVote ?? null,
      })),
    ]);

    setHasMore(data.hasMore);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {hydrated
          ? "Interactive ✓"
          : "Loading interactivity…"}
      </p>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setImproveError(null);
            }}
            placeholder="Ask a question..."
            className="flex-1 rounded-md border px-3 py-2"
          />

          <button
            type="button"
            onClick={improveDraft}
            disabled={!draft.trim() || improving}
            className="rounded-md border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {improving ? "Improving..." : "Improve with AI"}
          </button>

          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="rounded-md border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </div>

        {improveError && (
          <p className="text-sm text-red-600">{improveError}</p>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search questions..."
        className="w-full rounded-md border px-3 py-2"
      />

      <ul className="space-y-3">
        {questions.map((q) => (
          <li
            key={q.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => vote(q.id, "up")}
                aria-label="Upvote"
                aria-pressed={q.userVote === 1}
                className={`rounded-md border px-3 py-1 font-mono ${
                  q.userVote === 1
                    ? "border-green-600 bg-green-50 text-green-700"
                    : ""
                }`}
              >
                ▲
              </button>

              <span className="min-w-[2ch] text-center font-mono text-sm">
                {q.votes}
              </span>

              <button
                type="button"
                onClick={() => vote(q.id, "down")}
                aria-label="Downvote"
                aria-pressed={q.userVote === -1}
                className={`rounded-md border px-3 py-1 font-mono ${
                  q.userVote === -1
                    ? "border-red-600 bg-red-50 text-red-700"
                    : ""
                }`}
              >
                ▼
              </button>
            </div>

            <span>{q.body}</span>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="rounded-md border px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}