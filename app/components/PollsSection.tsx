"use client";

import { useEffect, useState } from "react";
import { getVoterId } from "@/lib/voter";

type Poll = {
  id: string;
  question: string;
  totalVotes: number;
  options: {
    id: string;
    option_text: string;
    votes: number;
  }[];
};

export default function PollsSection() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadPolls() {
    const res = await fetch("/api/polls");
    const data = await res.json();
    setPolls(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadPolls();
    const interval = setInterval(loadPolls, 4000);
    return () => clearInterval(interval);
  }, []);

  async function createPoll() {
    if (!question.trim() || !option1.trim() || !option2.trim()) return;

    setCreating(true);
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        options: [option1, option2],
      }),
    });

    setQuestion("");
    setOption1("");
    setOption2("");
    await loadPolls();
    setCreating(false);
  }

  async function vote(pollId: string, optionId: string) {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId, voterId: getVoterId() }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    loadPolls();
  }

  return (
    <section className="space-y-8 pb-8">
      <div>
        <h2 className="section-title">Create a poll</h2>
        <p className="section-subtitle mt-1">
          Let everyone pick between two options.
        </p>
      </div>

      <div className="card space-y-4 p-6 sm:p-8">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you want to ask?"
          className="input-field text-lg font-medium"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={option1}
            onChange={(e) => setOption1(e.target.value)}
            placeholder="Option A"
            className="input-field"
          />
          <input
            value={option2}
            onChange={(e) => setOption2(e.target.value)}
            placeholder="Option B"
            className="input-field"
          />
        </div>
        <button
          type="button"
          onClick={createPoll}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? "Creating…" : "Launch poll"}
        </button>
      </div>

      <div>
        <h2 className="section-title">Active polls</h2>
        <p className="section-subtitle mt-1">
          Click an option to vote — results update live.
        </p>
      </div>

      <div className="space-y-5">
        {polls.length === 0 && (
          <div className="card border-dashed px-6 py-14 text-center">
            <p className="font-semibold text-primary-dark">No polls yet</p>
            <p className="mt-1 text-sm text-muted">Create one above to get started.</p>
          </div>
        )}

        {polls.map((poll) => (
          <article key={poll.id} className="card p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-primary-dark">
                {poll.question}
              </h3>
              <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark">
                {poll.totalVotes} total
              </span>
            </div>

            <div className="space-y-4">
              {poll.options.map((option) => {
                const pct =
                  poll.totalVotes === 0
                    ? 0
                    : Math.round((option.votes / poll.totalVotes) * 100);

                return (
                  <div key={option.id}>
                    <button
                      type="button"
                      onClick={() => vote(poll.id, option.id)}
                      className="group w-full rounded-xl border border-border bg-white p-4 text-left transition hover:border-primary hover:bg-primary-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground group-hover:text-primary-dark">
                          {option.option_text}
                        </span>
                        <span className="shrink-0 text-sm font-medium text-muted">
                          {pct}%
                        </span>
                      </div>
                    </button>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-light">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dark transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
