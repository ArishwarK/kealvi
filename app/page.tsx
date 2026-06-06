import QuestionsList from "./questions-list";
import { getQuestionsPage } from "@/lib/questions";
import Link from "next/link";
import PollsSection from "./components/PollsSection";
// Render on every request (don't cache/prerender) so new questions show up.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

// Server component — runs only on the server, awaits the data, renders to HTML.
export default async function Page() {
  const { questions, hasMore } = await getQuestionsPage(0, PAGE_SIZE);

  return (
  <main className="mx-auto max-w-4xl p-6">
    <h1 className="mb-4 text-3xl font-bold">
      Live Q&A
    </h1>

    <QuestionsList
      initialQuestions={questions}
      initialHasMore={hasMore}
    />

    <div className="my-10 border-t" />

    <PollsSection />
  </main>
);
}
