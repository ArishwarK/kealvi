import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";

// Render on every request (don't cache/prerender) so new questions show up.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// Server component — runs only on the server, awaits the data, renders to HTML.
export default async function Page() {
  const { questions, hasMore } = await getQuestionsPage(0, PAGE_SIZE);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-balance">Live Q&amp;A</h1>
        <p className="mt-2 text-lg text-muted">Ask questions, get answers, and vote on the best ones</p>
      </div>
      <QuestionsList initialQuestions={questions} initialHasMore={hasMore} />
    </main>
  );
}
