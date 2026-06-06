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
  const [hydrated, setHydrated] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [newUpdates, setNewUpdates] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Auto refresh every 5 seconds when polling is enabled
  useEffect(() => {
    if (!pollingEnabled) return;

    const interval = setInterval(async () => {
      const url = query
        ? `/api/questions?q=${encodeURIComponent(query)}`
        : "/api/questions";

      const res = await fetch(url);
      const data = await res.json();

      const oldCount = questions.length;
      const newCount = data.questions.length;

      if (newCount > oldCount) {
        setNewUpdates(newCount - oldCount);
      }

      setQuestions(data.questions);
      setHasMore(data.hasMore);
    }, 5000);

    return () => clearInterval(interval);
  }, [query, pollingEnabled, questions.length]);

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
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPollingEnabled(!pollingEnabled);
                setNewUpdates(0);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                pollingEnabled
                  ? "bg-success text-white shadow-lg"
                  : "border border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${pollingEnabled ? "animate-pulse" : ""}`}></span>
              {pollingEnabled ? "Auto-refresh on" : "Auto-refresh off"}
            </button>
            {newUpdates > 0 && (
              <button
                onClick={() => {
                  setNewUpdates(0);
                  setQuestions([...questions]);
                }}
                className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark transition shadow-lg"
              >
                {newUpdates} new update{newUpdates !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-20 transition"
          />

          <button
            onClick={submit}
            className="rounded-lg bg-accent hover:bg-accent-dark text-white px-6 py-3 font-medium transition shadow-lg hover:shadow-xl"
          >
            Ask
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-20 transition"
        />
      </div>

      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => (
              <li
                key={q.id}
                className="group flex items-start gap-4 rounded-lg border border-border bg-gradient-to-br from-background to-background hover:border-accent hover:shadow-lg p-4 transition"
              >
                <button
                  onClick={() => upvote(q.id)}
                  className="flex-shrink-0 rounded-lg border border-border hover:border-accent hover:bg-accent hover:text-white px-3 py-2 font-mono text-sm text-accent font-semibold transition flex flex-col items-center min-w-[60px]"
                >
                  <span className="text-lg">▲</span>
                  <span>{q.votes}</span>
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-foreground break-words">{q.body}</p>
                  {q.author && (
                    <p className="mt-2 text-sm text-muted">By {q.author}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-border hover:border-accent text-accent hover:bg-accent hover:text-white px-6 py-3 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Load more questions"}
          </button>
        </div>
      )}
    </div>
  );
}
