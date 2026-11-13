import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadSession, saveSession } from '@/lib/storage';
import type { Session } from '@/types';

interface SessionCtx {
  session: Session | null;
  hydrated: boolean; // đã đọc xong từ bộ nhớ máy chưa
  setSession: (s: Session | null) => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setState] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadSession().then((s) => {
      setState(s);
      setHydrated(true);
    });
  }, []);

  const setSession = useCallback((s: Session | null) => {
    setState(s);
    void saveSession(s);
  }, []);

  const value = useMemo(() => ({ session, hydrated, setSession }), [session, hydrated, setSession]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession phải nằm trong SessionProvider');
  return ctx;
}
