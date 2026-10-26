import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Contributor } from "@/lib/contributors";

type AuthState = { user: User | null; profile: Contributor | null; isAdmin: boolean; refresh: () => Promise<void> };
const AuthContext = createContext<AuthState>({ user: null, profile: null, isAdmin: false, refresh: async () => {} });
export const useContributorAuth = () => useContext(AuthContext);

export function ContributorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Contributor | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  async function refresh() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (!data.user) { setProfile(null); setIsAdmin(false); return; }
    const result = await supabase.from("profiles").select("id,identifier,first_name,last_name").eq("id", data.user.id).maybeSingle();
    setProfile(result.data);
    const role = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(Boolean(role.data));
  }
  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      // Defer queries until the authentication callback releases its lock.
      setTimeout(() => { void refresh(); void router.invalidate(); if (event !== "SIGNED_OUT") void queryClient.invalidateQueries(); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={{ user, profile, isAdmin, refresh }}>{children}</AuthContext.Provider>;
}