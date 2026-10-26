/** Shared startup screen for persisted state and session restoration. */
const AppLoading = () => (
  <main className="flex min-h-dvh items-center justify-center bg-surface px-9 py-12">
    <div role="status" className="flex max-w-sm flex-col items-center gap-6">
      <div aria-hidden="true" className="flex items-center gap-2.5">
        <span className="size-2 shrink-0 rounded-full bg-brand" />
        <span className="font-outfit text-2xl leading-none font-medium tracking-tight text-brand-secondary">
          KarmaCircle
        </span>
      </div>
      <span
        aria-hidden="true"
        className="size-5 rounded-full border-2 border-brand/20 border-t-brand motion-safe:animate-spin"
      />
      <span className="sr-only">Loading KarmaCircle</span>
    </div>
  </main>
);

export default AppLoading;
