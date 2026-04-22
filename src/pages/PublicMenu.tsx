import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy QR route — redirects /m/:restaurantId → /r/:slug
 * so customers always land on the full public restaurant page.
 */
const PublicMenu = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!restaurantId) return;
      const { data } = await supabase.rpc("get_restaurant_slug_by_id", { _restaurant_id: restaurantId });
      const slug = (data as string | null) ?? null;
      if (!slug) { setError("Restaurant introuvable."); return; }
      const qs = params.toString();
      navigate(`/r/${slug}${qs ? `?${qs}` : ""}`, { replace: true });
    };
    run();
  }, [restaurantId, params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {error ?? "Redirection…"}
    </div>
  );
};

export default PublicMenu;
