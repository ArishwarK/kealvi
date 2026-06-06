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

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadPolls() {
    const res = await fetch("/api/polls");
    const data = await res.json();
    setPolls(data);
  }

  useEffect(() => {
    loadPolls();

    const interval = setInterval(() => {
      loadPolls();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  async function createPoll() {
  if (!question.trim()) return;
  if (!option1.trim()) return;
  if (!option2.trim()) return;

  setCreating(true);

  await fetch("/api/polls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

  async function vote(
  pollId: string,
  optionId: string
) {
  const res = await fetch(
    `/api/polls/${pollId}/vote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        optionId,
        voterId: getVoterId(),
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    alert(data.error);
    return;
  }

  loadPolls();
}

  return (
  <main className="mx-auto max-w-4xl p-8">
    <h1 className="mb-8 text-4xl font-bold">
      Create Poll
    </h1>

    <div className="mb-12 rounded-xl border bg-white p-6 shadow-sm">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Poll Question"
        className="mb-4 w-full rounded-lg border p-4 text-lg outline-none focus:border-blue-500"
      />

      <input
        value={option1}
        onChange={(e) => setOption1(e.target.value)}
        placeholder="Option 1"
        className="mb-4 w-full rounded-lg border p-4 outline-none focus:border-blue-500"
      />

      <input
        value={option2}
        onChange={(e) => setOption2(e.target.value)}
        placeholder="Option 2"
        className="mb-4 w-full rounded-lg border p-4 outline-none focus:border-blue-500"
      />

      <button
  onClick={createPoll}
  disabled={creating}
  className="rounded-lg bg-black px-6 py-3 font-medium text-white"
>
  {creating ? "Creating..." : "Create Poll"}
</button>
    </div>

    <div className="mb-6 border-b pb-4">
      <h2 className="text-3xl font-bold">
        Active Polls
      </h2>
    </div>

    <div className="space-y-6">
      {polls.map((poll) => (
        <div
          key={poll.id}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-2xl font-semibold">
              {poll.question}
            </h3>

            <span className="text-gray-500">
              Total: {poll.totalVotes}
            </span>
          </div>

          {poll.options.map((option) => {
            const percentage =
              poll.totalVotes === 0
                ? 0
                : Math.round(
                    (option.votes / poll.totalVotes) *
                      100
                  );

            return (
              <div
                key={option.id}
                className="mb-5"
              >
                <button
                  onClick={() =>
                    vote(
                      poll.id,
                      option.id
                    )
                  }
                  className="w-full rounded-lg border p-4 text-left transition hover:bg-gray-50"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {option.option_text}
                    </span>

                    <span className="text-gray-500">
                      {option.votes} vote
                      {option.votes !== 1 ? "s" : ""}
                      {" "}
                      ({percentage}%)
                    </span>
                  </div>
                </button>

                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  </main>
);
}