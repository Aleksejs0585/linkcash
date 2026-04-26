import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">VibeLink</h1>
        <p className="mt-3 text-zinc-400">Minimal Web3 gifting app</p>
        <Link
          href="/create"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 text-lg font-medium transition hover:bg-blue-500"
        >
          Go to Create
        </Link>
      </div>
    </main>
  );
}
