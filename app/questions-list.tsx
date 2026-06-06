"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getVoterId } from "@/lib/voter";
import {
  applyPinnedVotes,
  applyVoteOptimistic,
  mergeQuestionList,
  type VoteDirection,
} from "@/lib/vote-client";
import type { UserVote } from "@/lib/votes";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
  userVote: UserVote;
};

const PINNED_VOTE_MS = 3000;

function questionsUrl(query: string, voterId?: string, offset?: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (offset !== undefined) params.set("offset", String(offset));
  if (voterId) params.set("voterId", voterId);
  const qs = params.toString();
  return qs ? `/api/questions?${qs}` : "/api/questions";
}

function visibleQuestionsUrl(
  query: string,
  voterId: string,
  visibleIds: string[]
) {
  if (query) return questionsUrl(query, voterId);
  if (visibleIds.length === 0) return questionsUrl("", voterId);

  const params = new URLSearchParams();
  params.set("ids", visibleIds.join(","));
  params.set("voterId", voterId);
  return `/api/questions?${params.toString()}`;
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
  const [votingIds, setVotingIds] = useState<Set<string>>(() => new Set());

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchSeqRef = useRef(0);
  const pinnedVotesRef = useRef(
    new Map<string, { votes: number; userVote: UserVote }>()
  );
  const votingRef = useRef(new Set<string>());

  useEffect(() => {
    setVoterId(getVoterId());
    setHydrated(true);
  }, []);

  const applyServerQuestions = useCallback((incoming: Question[]) => {
    setQuestions((prev) =>
      applyPinnedVotes(
        mergeQuestionList(prev, incoming),
        pinnedVotesRef.current
      )
    );
  }, []);

  const refreshQuestions = useCallback(
    async (options?: { offset?: number; replace?: boolean }) => {
      if (!voterId) return;
      if (votingRef.current.size > 0) return;

      const seq = ++fetchSeqRef.current;
      const currentQuery = queryRef.current;
      const visibleIds = questionsRef.current.map((q) => q.id);

      const url =
        options?.offset !== undefined
          ? questionsUrl(currentQuery, voterId, options.offset)
          : visibleQuestionsUrl(currentQuery, voterId, visibleIds);

      const res = await fetch(url);
      if (seq !== fetchSeqRef.current) return;

      const data = await res.json();
      const incoming = (data.questions ?? []).map((q: Question) => ({
        ...q,
        userVote: q.userVote ?? null,
      }));

      if (options?.replace) {
        setQuestions(
          applyPinnedVotes(incoming, pinnedVotesRef.current)
        );
      } else if (options?.offset !== undefined) {
        setQuestions((prev) =>
          applyPinnedVotes(
            [
              ...prev,
              ...incoming.filter(
                (q: Question) => !prev.some((p) => p.id === q.id)
              ),
            ],
            pinnedVotesRef.current
          )
        );
      } else {
        applyServerQuestions(incoming);

        if (!currentQuery && visibleIds.length > 0) {
          const pageSeq = ++fetchSeqRef.current;
          const pageRes = await fetch(questionsUrl("", voterId));
          if (pageSeq !== fetchSeqRef.current) return;

          const pageData = await pageRes.json();
          const pageIncoming = (pageData.questions ?? []).map(
            (q: Question) => ({
              ...q,
              userVote: q.userVote ?? null,
            })
          );
          applyServerQuestions(pageIncoming);
        }
      }

      if (data.hasMore !== undefined) {
        setHasMore(data.hasMore);
      }
    },
    [voterId, applyServerQuestions]
  );

  // Auto refresh every 2 seconds
  useEffect(() => {
    if (!voterId) return;

    const interval = setInterval(() => {
      refreshQuestions();
    }, 2000);

    return () => clearInterval(interval);
  }, [voterId, refreshQuestions]);

  // Search debounce
  useEffect(() => {
    if (!voterId) return;

    const id = setTimeout(() => {
      refreshQuestions({ replace: true });
    }, 300);

    return () => clearTimeout(id);
  }, [query, voterId, refreshQuestions]);

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
    if (!voterId || votingRef.current.has(id)) return;

    votingRef.current.add(id);
    setVotingIds(new Set(votingRef.current));
    fetchSeqRef.current++;

    let previous: Question | undefined;

    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) return q;
        previous = q;
        return { ...q, ...applyVoteOptimistic(q, direction) };
      })
    );

    try {
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to cast vote");
      }

      const authoritative = {
        votes: data.score as number,
        userVote: data.userVote as UserVote,
      };

      pinnedVotesRef.current.set(id, authoritative);

      setQuestions((qs) =>
        qs.map((q) => (q.id === id ? { ...q, ...authoritative } : q))
      );

      window.setTimeout(() => {
        pinnedVotesRef.current.delete(id);
      }, PINNED_VOTE_MS);
    } catch (error) {
      if (previous) {
        setQuestions((qs) =>
          qs.map((q) => (q.id === id ? previous! : q))
        );
      }
      if (process.env.NODE_ENV !== "production") {
        console.debug("[vote] client error", { id, direction, error });
      }
    } finally {
      votingRef.current.delete(id);
      setVotingIds(new Set(votingRef.current));
    }
  }

  async function loadMore() {
    setLoading(true);
    await refreshQuestions({ offset: questions.length });
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
                disabled={votingIds.has(q.id)}
                aria-label="Upvote"
                aria-pressed={q.userVote === 1}
                className={`rounded-md border px-3 py-1 font-mono disabled:opacity-50 ${
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
                disabled={votingIds.has(q.id)}
                aria-label="Downvote"
                aria-pressed={q.userVote === -1}
                className={`rounded-md border px-3 py-1 font-mono disabled:opacity-50 ${
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
