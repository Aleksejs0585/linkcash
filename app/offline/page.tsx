"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a10] px-4">
      <div className="text-center space-y-4">
        <p className="text-5xl">📡</p>
        <h1 className="text-2xl font-bold text-white">You're offline</h1>
        <p className="text-white/50 text-sm">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
