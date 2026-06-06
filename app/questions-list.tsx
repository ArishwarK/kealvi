"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getVoterId } from "@/lib/voter";
import VoteControls from "@/app/components/VoteControls";
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

const PINNED_VOTE_MS = 8000;
const POLL_MS = 4000;

function buildUrl(
  voterId: string,
  opts: { query?: string; offset?: number; ids?: string[] }
) {
  const params = new URLSearchParams();
  params.set("voterId", voterId);
  if (opts.query) params.set("q", opts.query);
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts.ids?.length) params.set("ids", opts.ids.join(","));
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
    initialQuestions.map((q) => ({ ...q, userVote: q.userVote ?? null }))
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
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
  const mountedRef = useRef(false);

  useEffect(() => {
    setVoterId(getVoterId());
  }, []);

  const applyIncoming = useCallback((incoming: Question[], replace = false) => {
    const normalized = incoming.map((q) => ({
      ...q,
      userVote: q.userVote ?? null,
    }));

    setQuestions((prev) =>
      applyPinnedVotes(
        replace ? normalized : mergeQuestionList(prev, normalized),
        pinnedVotesRef.current
      )
    );
  }, []);

  const syncQuestions = useCallback(
    async (opts?: { replace?: boolean; offset?: number }) => {
      if (!voterId) return;
      if (votingRef.current.size > 0) return;

      const seq = ++fetchSeqRef.current;
      const currentQuery = queryRef.current.trim();

      try {
        if (opts?.offset !== undefined) {
          const res = await fetch(
            buildUrl(voterId, { offset: opts.offset, query: currentQuery })
          );
          if (seq !== fetchSeqRef.current) return;
          const data = await res.json();
          applyIncoming(data.questions ?? [], false);
          if (data.hasMore !== undefined) setHasMore(data.hasMore);
          return;
        }

        if (currentQuery) {
          const res = await fetch(buildUrl(voterId, { query: currentQuery }));
          if (seq !== fetchSeqRef.current) return;
          const data = await res.json();
          applyIncoming(data.questions ?? [], opts?.replace ?? true);
          setHasMore(false);
          return;
        }

        const visibleIds = questionsRef.current.map((q) => q.id);
        const requests: Promise<Response>[] = [
          fetch(buildUrl(voterId, {})),
        ];
        if (visibleIds.length > 0) {
          requests.push(fetch(buildUrl(voterId, { ids: visibleIds })));
        }

        const responses = await Promise.all(requests);
        if (seq !== fetchSeqRef.current) return;

        const [pageData, idsData] = await Promise.all(
          responses.map((r) => r.json())
        );

        setQuestions((prev) => {
          let next = mergeQuestionList(prev, pageData.questions ?? []);
          if (idsData?.questions?.length) {
            next = mergeQuestionList(next, idsData.questions);
          }
          return applyPinnedVotes(next, pinnedVotesRef.current);
        });

        if (pageData.hasMore !== undefined) setHasMore(pageData.hasMore);
      } catch {
        // ignore transient network errors during background sync
      }
    },
    [voterId, applyIncoming]
  );

  useEffect(() => {
    if (!voterId) return;
    syncQuestions({ replace: !mountedRef.current });
    mountedRef.current = true;
  }, [voterId, syncQuestions]);

  useEffect(() => {
    if (!voterId) return;
    const interval = setInterval(() => syncQuestions(), POLL_MS);
    return () => clearInterval(interval);
  }, [voterId, syncQuestions]);

  useEffect(() => {
    if (!voterId) return;
    const timer = setTimeout(() => {
      syncQuestions({ replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, voterId, syncQuestions]);

  async function improveDraft() {
    if (!draft.trim() || improving) return;
    setImproving(true);
    setImproveError(null);

    try {
      const res = await fetch("/api/improve-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to improve question");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
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
    setVoteError(null);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, direction }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to cast vote");
      }

      const authoritative = {
        votes: Number(data.score),
        userVote: (data.userVote ?? null) as UserVote,
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
      setVoteError(
        error instanceof Error
          ? error.message
          : "Vote failed. Check your database migration."
      );
    } finally {
      votingRef.current.delete(id);
      setVotingIds(new Set(votingRef.current));
    }
  }

  async function loadMore() {
    setLoading(true);
    await syncQuestions({ offset: questions.length });
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div className="live-badge">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Live — updates every few seconds
      </div>

      <div className="space-y-3">
        <label htmlFor="question-draft" className="section-subtitle block font-semibold text-primary-dark">
          Ask a question
        </label>
        <textarea
          id="question-draft"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setImproveError(null);
          }}
          placeholder="Type your question here…"
          rows={2}
          className="input-field resize-none"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={improveDraft}
            disabled={!draft.trim() || improving}
            className="btn-secondary"
          >
            {improving ? "Improving…" : "Improve with AI"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="btn-primary"
          >
            Post question
          </button>
        </div>
        {improveError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
            {improveError}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <label htmlFor="question-search" className="section-subtitle block font-semibold text-primary-dark">
          Search
        </label>
        <input
          id="question-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a question…"
          className="input-field"
        />
      </div>

      {voteError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
          {voteError}
        </p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold text-primary-dark">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </p>

        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="question-item">
              <VoteControls
                votes={q.votes}
                userVote={q.userVote}
                disabled={votingIds.has(q.id)}
                onVote={(direction) => vote(q.id, direction)}
              />
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-base leading-relaxed text-foreground">
                  {q.body}
                </p>
                {q.author && (
                  <p className="mt-2 text-xs text-muted">— {q.author}</p>
                )}
              </div>
            </li>
          ))}

          {questions.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border bg-white/70 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-primary-dark">
                No questions yet
              </p>
              <p className="mt-1 text-sm text-muted">
                Be the first to start the conversation.
              </p>
            </li>
          )}
        </ul>
      </div>

      {hasMore && !query && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="btn-secondary w-full"
        >
          {loading ? "Loading…" : "Load more questions"}
        </button>
      )}
    </div>
  );
}
