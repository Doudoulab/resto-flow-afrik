import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const openCheckout = async (priceId: string) => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: { email: user.email! },
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/checkout/success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e: any) {
      toast.error("Impossible d'ouvrir le checkout: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}