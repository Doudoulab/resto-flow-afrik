import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type OwnedRestaurant = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  suspended_at: string | null;
  is_active: boolean;
};

export function useOwnedRestaurants() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned-restaurants", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OwnedRestaurant[]> => {
      const { data, error } = await supabase.rpc("user_owned_restaurants");
      if (error) throw error;
      return (data ?? []) as OwnedRestaurant[];
    },
  });
}

export function useSwitchRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const { data, error } = await supabase.rpc("switch_active_restaurant", {
        _restaurant_id: restaurantId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result?.success) throw new Error(result?.error ?? "switch_failed");
      return restaurantId;
    },
    onSuccess: () => {
      toast.success("Restaurant changé");
      // Force complete reload so all queries refetch with new restaurant_id
      setTimeout(() => window.location.assign("/app"), 300);
    },
    onError: (e: Error) => {
      toast.error("Impossible de basculer : " + e.message);
    },
  });
}

export function useCreateRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, switchTo = true }: { name: string; switchTo?: boolean }) => {
      const { data, error } = await supabase.rpc("create_additional_restaurant", {
        _name: name,
        _switch: switchTo,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; restaurant_id?: string };
      if (!result?.success) throw new Error(result?.error ?? "create_failed");
      return result.restaurant_id!;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["owned-restaurants"] });
      toast.success("Établissement créé");
      if (vars.switchTo) setTimeout(() => window.location.assign("/app"), 300);
    },
    onError: (e: Error) => {
      const msg = e.message.includes("quota_exceeded")
        ? "Quota atteint. Passez au plan Business pour gérer plusieurs établissements."
        : "Création impossible : " + e.message;
      toast.error(msg);
    },
  });
}