import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setMonitoringRestaurantId } from "@/lib/monitoring/logger";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  restaurant_id: string | null;
  is_owner: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  owner_id: string;
  slug?: string | null;
  country_code?: string | null;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  whatsapp?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  theme_color?: string | null;
  opening_hours?: unknown;
  accepts_online_orders?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  restaurant: Restaurant | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(prof as Profile | null);

    if (prof?.restaurant_id) {
      const { data: resto } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", prof.restaurant_id)
        .maybeSingle();
      setRestaurant(resto as Restaurant | null);
      setMonitoringRestaurantId(prof.restaurant_id);
    } else {
      setRestaurant(null);
      setMonitoringRestaurantId(null);
    }
  };

  useEffect(() => {
    // Listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => { loadProfile(sess.user.id); }, 0);
      } else {
        setProfile(null);
        setRestaurant(null);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadProfile(sess.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRestaurant(null);
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, restaurant, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
