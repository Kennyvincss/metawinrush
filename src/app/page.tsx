"use client";
import dynamic from "next/dynamic";

// The game and its procedural art need the browser (canvas, Web Audio), so the app renders client-side only.
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[100dvh] place-items-center">
      <div className="heading animate-pulse text-sm tracking-[0.4em] text-white/60">METAWIN RUSH</div>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
