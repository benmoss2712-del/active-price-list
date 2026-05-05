import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearActiveSession,
  createAccount,
  findUserById,
  listPublicUsers,
  loadActiveSession,
  saveActiveSession,
  verifyPin,
  type CreateAccountInput,
  type CreateAccountResult,
  type PublicUser,
  type VerifyResult,
} from "./userAccountStorage";

export type AuthContextValue = {
  hydrated: boolean;
  user: PublicUser | null;
  users: PublicUser[];
  signIn: (userId: string, pin: string) => Promise<VerifyResult>;
  signUp: (input: CreateAccountInput) => Promise<CreateAccountResult>;
  signOut: () => Promise<void>;
  refreshUsers: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);

  const refreshUsers = useCallback(async () => {
    const list = await listPublicUsers();
    setUsers(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listPublicUsers();
      const session = await loadActiveSession();
      const restored =
        session && (await findUserById(session.userId).catch(() => null));
      if (cancelled) return;
      setUsers(list);
      setUser(restored ?? null);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (userId: string, pin: string): Promise<VerifyResult> => {
      const result = await verifyPin(userId, pin);
      if (result.ok) {
        await saveActiveSession(result.user.id);
        setUser(result.user);
      }
      return result;
    },
    []
  );

  const signUp = useCallback(
    async (input: CreateAccountInput): Promise<CreateAccountResult> => {
      const result = await createAccount(input);
      if (result.ok) {
        await saveActiveSession(result.user.id);
        setUsers((prev) =>
          [...prev, result.user].sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
          )
        );
        setUser(result.user);
      }
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    await clearActiveSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ hydrated, user, users, signIn, signUp, signOut, refreshUsers }),
    [hydrated, user, users, signIn, signUp, signOut, refreshUsers]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
