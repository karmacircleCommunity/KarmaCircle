import { Helmet } from "react-helmet-async";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";

/**
 * The `*` catch-all route's page.
 *
 * Rebuilt in August 2026. The previous version was a single full-bleed
 * Freepik illustration sized `width: 60%` with no `max-width` (so on a
 * wide monitor a 750x500 artboard was drawn ~2.4x past its design size),
 * a `Button` with no `className` (the shared button ships no padding or
 * radius of its own, so it rendered as a bare brand-coloured rectangle),
 * and a `.button-wrapper` class that was never defined anywhere, which
 * left that button flush against x=0. It also rendered no `Navbar` or
 * `Footer`, unlike every other page in the app.
 *
 * This version is typographic and carries the normal site chrome. It is
 * deliberately the same shape as `EventNotFound` in
 * `features/events/pages/DetailedEvent.tsx` - eyebrow chip, heading,
 * one sentence of explanation, one primary action - so the app's global
 * 404 and its in-page empty state read as the same product.
 */
const Error404 = () => {
  return (
    <>
      <Helmet>
        <title>KarmaCircle | Page not found</title>
        <meta
          name="description"
          content="That page doesn't exist on KarmaCircle. Head back to the home page, or browse organizations and events."
        />
      </Helmet>
      <Navbar />

      {/* min-h keeps the footer at the bottom of the viewport on a page
          this short, instead of riding up under the copy. */}
      <main className="mx-auto flex min-h-[68vh] max-w-2xl flex-col items-start px-9 py-20 sm:px-10 sm:py-24 lg:px-12">
        <span className="rounded-full border border-brand/20 bg-brand/5 px-3.5 py-1.5 font-outfit text-caption font-medium tracking-[0.16em] text-brand uppercase">
          Error 404
        </span>

        <h1 className="mt-6 font-outfit text-[2rem] leading-tight font-semibold tracking-tight text-brand-secondary sm:text-4xl">
          This page isn&apos;t here.
        </h1>

        <p className="mt-4 font-poppins text-body leading-6 text-ink/70 sm:text-body-lg sm:leading-7">
          The address you followed doesn&apos;t match anything on KarmaCircle.
          It may have been taken down, or the link may have been mistyped.
        </p>

        <Button
          to="/"
          className="mt-8 inline-flex w-auto items-center gap-2 rounded-full border-none px-6 py-3 font-poppins text-body font-medium no-underline"
        >
          <FiArrowLeft aria-hidden="true" /> Back to home
        </Button>

        <p className="mt-6 font-poppins text-body text-ink/60">
          Or browse{" "}
          <Link
            to="/organizations"
            className="text-brand underline underline-offset-4 transition-colors duration-200 hover:text-brand-hover"
          >
            organizations
          </Link>{" "}
          and{" "}
          <Link
            to="/events"
            className="text-brand underline underline-offset-4 transition-colors duration-200 hover:text-brand-hover"
          >
            events
          </Link>
          .
        </p>
      </main>

      <Footer />
    </>
  );
};

export default Error404;
