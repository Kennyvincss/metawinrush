"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { audio } from "@/game/audio/engine";
import { LocalBackend } from "@/lib/backend/local";
import { RemoteBackend, onlineConfigured, supabaseBrowser } from "@/lib/backend/remote";
import type { Backend } from "@/lib/backend/types";
import { isCityId, type CityId } from "@/lib/data/cities";
import type { PlayerState } from "@/lib/progression/state";

export type Screen = "home" | "cities" | "missions" | "leaderboard" | "arena" | "shop" | "achievements" | "profile" | "game";

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "success" | "error" | "reward";
}

interface Ctx {
  backend: Backend | null;
  mode: "local" | "online";
  state: PlayerState | null;
  status: "loading" | "needs-auth" | "ready" | "error";
  error: string | null;
  screen: Screen;
  go(s: Screen): void;
  city: CityId;
  setCity(c: CityId): void;
  setState(s: PlayerState): void;
  run<T>(fn: (b: Backend) => Promise<T>, okText?: string): Promise<T | undefined>;
  toast(text: string, kind?: Toast["kind"]): void;
  toasts: Toast[];
  dailyOpen: boolean;
  setDailyOpen(v: boolean): void;
  signInGuest(): Promise<void>;
  signInEmail(email: string): Promise<void>;
  linkEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
  userEmail: string | null;
  isGuest: boolean;
  reload(): Promise<void>;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

const CITY_KEY = "mwrush:city";

export function AppProvider({ children }: { children: ReactNode }) {
  const online = onlineConfigured();
  const backend = useMemo<Backend>(() => (online ? new RemoteBackend() : new LocalBackend()), [online]);
  const [state, setState] = useState<PlayerState | null>(null);
  const [status, setStatus] = useState<Ctx["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [city, setCityState] = useState<CityId>("tokyo");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(!online);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 5000 : 3200);
  }, []);

  const load = useCallback(async () => {
    try {
      setStatus("loading");
      if (online) {
        const { data } = await supabaseBrowser().auth.getSession();
        if (!data.session) {
          setStatus("needs-auth");
          return;
        }
        setUserEmail(data.session.user.email ?? null);
        setIsGuest(!!data.session.user.is_anonymous);
      }
      const s = await backend.load();
      setState(s);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [backend, online]);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CITY_KEY);
      if (isCityId(c)) setCityState(c);
    } catch {
      /* ignore */
    }
    void load();
    if (!online) return;
    const { data } = supabaseBrowser().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => data.subscription.unsubscribe();
  }, [load, online]);

  // Keep the selected city valid.
  useEffect(() => {
    if (state && !state.unlockedCities.includes(city)) setCityState("tokyo");
  }, [state, city]);

  // Menu music (starts after the first user gesture because of autoplay rules).
  useEffect(() => {
    if (!state) return;
    audio.setEnabled(state.settings.music, state.settings.sfx);
    if (screen === "game") return;
    const start = () => {
      audio.unlock();
      if (audio.currentTrack !== "menu") audio.playMusic("menu");
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    if (audio.currentTrack && audio.currentTrack !== "menu") audio.playMusic("menu");
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [screen, state]);

  const run = useCallback(
    async <T,>(fn: (b: Backend) => Promise<T>, okText?: string) => {
      try {
        const out = await fn(backend);
        if (okText) toast(okText, "success");
        return out;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Something went wrong", "error");
        return undefined;
      }
    },
    [backend, toast],
  );

  const go = useCallback((s: Screen) => {
    audio.play("click");
    setScreen(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  const setCity = useCallback((c: CityId) => {
    setCityState(c);
    try {
      localStorage.setItem(CITY_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value: Ctx = {
    backend,
    mode: backend.mode,
    state,
    status,
    error,
    screen,
    go,
    city,
    setCity,
    setState,
    run,
    toast,
    toasts,
    dailyOpen,
    setDailyOpen,
    userEmail,
    isGuest,
    reload: load,
    async signInGuest() {
      const { error: e } = await supabaseBrowser().auth.signInAnonymously();
      if (e) toast(e.message, "error");
    },
    async signInEmail(email: string) {
      const { error: e } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (e) toast(e.message, "error");
      else toast("Check your inbox for a sign-in link", "success");
    },
    async linkEmail(email: string) {
      const { error: e } = await supabaseBrowser().auth.updateUser({ email });
      if (e) toast(e.message, "error");
      else toast("Confirmation sent — open the email to secure your account", "success");
    },
    async signOut() {
      await supabaseBrowser().auth.signOut();
      setState(null);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
