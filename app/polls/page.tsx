import PollsSection from "../components/PollsSection";

export default function PollsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <section className="mb-10">
        <p className="mb-3 inline-flex rounded-full bg-primary-light px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-dark">
          Live polls
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-primary-dark">
          Community Polls
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-muted">
          Create polls and watch results update in real time.
        </p>
      </section>

      <PollsSection />
    </div>
  );
}
