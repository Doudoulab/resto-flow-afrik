import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaddleEnv } from "@/lib/paddle";

export type PlanTier = "free" | "pro" | "business";

export interface Subscription {
  id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  paddle_subscription_id: string;
}

export function productToTier(productId?: string | null): PlanTier {
  if (productId === "pro_plan") return "pro";
  if (productId === "business_plan") return "business";
  return "free";
}

const TIER_RANK: Record<PlanTier, number> = { free: 0, pro: 1, business: 2 };

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const env = getPaddleEnv();

  const fetchSub = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", env)
      .maybeSingle();
    setSubscription((data as Subscription | null) ?? null);
    setLoading(false);
  }, [user, env]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  useEffect(() => {
    if (!user) return;
    const channelName = `subs:${user.id}:${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSub]);

  const isActive =
    !!subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  const tier: PlanTier = isActive ? productToTier(subscription?.product_id) : "free";

  const hasTier = (required: PlanTier) => TIER_RANK[tier] >= TIER_RANK[required];

  const isTrialing = !!subscription && subscription.status === "trialing" && isActive;
  const trialDaysLeft = (() => {
    if (!isTrialing || !subscription?.current_period_end) return 0;
    const ms = new Date(subscription.current_period_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  return {
    subscription,
    loading,
    isActive,
    tier,
    hasTier,
    isTrialing,
    trialDaysLeft,
    environment: env,
    refetch: fetchSub,
  };
}