import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthPhase = "initializing" | "checking_admin" | "ready";

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [phase, setPhase] = useState<AuthPhase>("initializing");
  const authRunId = useRef(0);

  const syncAuthState = useCallback(async (nextSession: Session | null, source: "listener" | "bootstrap") => {
    const currentRunId = ++authRunId.current;

    if (import.meta.env.DEV) {
      console.info("[auth] sync start", { source, hasSession: !!nextSession, userId: nextSession?.user?.id ?? null });
    }

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setIsAdmin(false);
      setPhase("ready");
      if (import.meta.env.DEV) console.info("[auth] no user, ready");
      return;
    }

    setPhase("checking_admin");

    try {
      const { data, error } = await supabase.rpc("is_admin");

      if (currentRunId !== authRunId.current) return;

      if (error) {
        setIsAdmin(false);
        if (import.meta.env.DEV) console.error("[auth] is_admin error", error);
      } else {
        setIsAdmin(Boolean(data));
        if (import.meta.env.DEV) console.info("[auth] is_admin result", { isAdmin: Boolean(data) });
      }
    } catch (error) {
      if (currentRunId !== authRunId.current) return;
      setIsAdmin(false);
      if (import.meta.env.DEV) console.error("[auth] is_admin exception", error);
    } finally {
      if (currentRunId === authRunId.current) {
        setPhase("ready");
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void syncAuthState(newSession, "listener");
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      void syncAuthState(existing, "bootstrap");
    });

    return () => subscription.unsubscribe();
  }, [syncAuthState]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setPhase("ready");
    authRunId.current += 1;
  }, []);

  const loading = phase !== "ready";

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

