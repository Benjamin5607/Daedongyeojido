import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-serif text-4xl font-semibold text-[var(--color-ink)]">
        404
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">Page not found</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[var(--color-trip-green)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-trip-green-dark)]"
      >
        Back to home
      </Link>
    </div>
  );
}
