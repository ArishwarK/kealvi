"use client";

import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
};

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Auto refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const url = query
        ? `/api/questions?q=${encodeURIComponent(query)}`
        : "/api/questions";

      const res = await fetch(url);
      const data = await res.json();

      setQuestions(data.questions);
      setHasMore(data.hasMore);
    }, 2000);

    return () => clearInterval(interval);
  }, [query]);

  // Search
  useEffect(() => {
    const id = setTimeout(async () => {
      const url = query
        ? `/api/questions?q=${encodeURIComponent(query)}`
        : "/api/questions";

      const res = await fetch(url);
      const data = await res.json();

      setQuestions(data.questions);
      setHasMore(data.hasMore);
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
  let fetching = false;

  const interval = setInterval(async () => {
    if (fetching) return;

    fetching = true;

    try {
      const res = await fetch("/api/questions");
      const data = await res.json();

      setQuestions(data.questions);
      setHasMore(data.hasMore);
    } finally {
      fetching = false;
    }
  }, 2000);

  return () => clearInterval(interval);
}, []);

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
      { ...created, votes: 0 },
      ...qs,
    ]);

    setDraft("");
  }

  async function upvote(id: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? { ...q, votes: q.votes + 1 }
          : q
      )
    );

    const res = await fetch(`/api/questions/${id}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voterId: getVoterId(),
      }),
    });

    if (!res.ok) {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id
            ? { ...q, votes: q.votes - 1 }
            : q
        )
      );
    }
  }

  async function loadMore() {
    setLoading(true);

    const res = await fetch(
      `/api/questions?offset=${questions.length}`
    );

    const data = await res.json();

    setQuestions((qs) => [
      ...qs,
      ...data.questions,
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
            <button
              onClick={() => upvote(q.id)}
              className="rounded-md border px-3 py-1 font-mono"
            >
              ▲ {q.votes}
            </button>

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