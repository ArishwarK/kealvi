import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";
import PollsSection from "./components/PollsSection";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Page() {
  const { questions, hasMore } = await getQuestionsPage(0, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <section className="mb-10 text-center sm:text-left">
        <p className="mb-3 inline-flex rounded-full bg-primary-light px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-dark">
          Live session
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-primary-dark sm:text-5xl">
          Ask. Vote. Engage.
        </h1>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-muted sm:mx-0">
          Submit questions, polish them with AI, and upvote the best ones —
          all in real time.
        </p>
      </section>

      <section className="card mb-14 p-6 sm:p-8">
        <QuestionsList
          initialQuestions={questions}
          initialHasMore={hasMore}
        />
      </section>

      <div className="mb-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-sm font-bold uppercase tracking-wider text-primary">
          Polls
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <PollsSection />
    </div>
  );
}
