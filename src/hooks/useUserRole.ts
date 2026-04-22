import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "manager" | "waiter" | "chef";

/**
 * Le rôle UI est dérivé UNIQUEMENT du profil serveur (profile.is_owner).
 * Aucune écriture/lecture en localStorage : un employé ne peut pas
 * s'auto-promouvoir en manager via la console. Les permissions réelles
 * restent appliquées par les RLS Supabase.
 */
export const useUserRole = () => {
  const { profile } = useAuth();
  const role: UserRole = profile?.is_owner ? "manager" : "waiter";
  // setRole conservé pour compat API mais désactivé (no-op)
  const setRole = (_r: UserRole) => {
    // intentionally no-op: role is server-derived
  };
  return { role, setRole };
};
