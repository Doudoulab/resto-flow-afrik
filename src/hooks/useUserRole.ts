import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "manager" | "waiter" | "chef";

const KEY = "user:role";

export const useUserRole = () => {
  const { profile } = useAuth();
  const [role, setRoleState] = useState<UserRole>(() => {
    const stored = localStorage.getItem(KEY) as UserRole | null;
    if (stored) return stored;
    return profile?.is_owner ? "manager" : "waiter";
  });

  useEffect(() => {
    if (!localStorage.getItem(KEY) && profile) {
      setRoleState(profile.is_owner ? "manager" : "waiter");
    }
  }, [profile?.is_owner]);

  const setRole = (r: UserRole) => {
    localStorage.setItem(KEY, r);
    setRoleState(r);
  };

  return { role, setRole };
};
