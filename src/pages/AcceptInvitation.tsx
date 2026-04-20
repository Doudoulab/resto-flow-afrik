import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ChefHat } from "lucide-react";
import { toast } from "sonner";

interface InvitationInfo {
  email?: string;
  role?: string;
  restaurant_name?: string;
  expired?: boolean;
  accepted?: boolean;
  error?: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Gérant",
  waiter: "Serveur",
  kitchen: "Cuisine",
  cashier: "Caissier",
};

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (error) toast.error(error.message);
      setInfo((data as InvitationInfo) ?? { error: "not_found" });
      setLoading(false);
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    if (!user) {
      // Redirect to auth, then come back
      sessionStorage.setItem("pending_invitation", token);
      navigate(`/auth?redirect=/invitation/${token}&email=${encodeURIComponent(info?.email ?? "")}`);
      return;
    }
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
    setAccepting(false);
    if (error) { toast.error(error.message); return; }
    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      toast.error(result.error === "invalid_or_expired" ? "Invitation invalide ou expirée" : result.error ?? "Erreur");
      return;
    }
    toast.success("Bienvenue dans l'équipe !");
    await refresh();
    navigate("/app");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>Invitation RestoFlow</CardTitle>
          <CardDescription>
            {info?.restaurant_name && `${info.restaurant_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info?.error === "not_found" && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p>Cette invitation n'existe pas.</p>
            </div>
          )}
          {info?.accepted && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p>Cette invitation a déjà été acceptée.</p>
              <Button onClick={() => navigate("/auth")}>Se connecter</Button>
            </div>
          )}
          {info?.expired && !info?.accepted && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p>Cette invitation a expiré. Demandez-en une nouvelle au gérant.</p>
            </div>
          )}
          {info && !info.error && !info.accepted && !info.expired && (
            <>
              <div className="rounded-md border bg-muted/40 p-4 text-sm">
                <p>Vous êtes invité(e) à rejoindre <strong>{info.restaurant_name}</strong> en tant que <strong>{ROLE_LABELS[info.role ?? ""] ?? info.role}</strong>.</p>
                <p className="mt-2 text-muted-foreground">Email : {info.email}</p>
              </div>
              {!user ? (
                <>
                  <p className="text-sm text-muted-foreground">Créez un compte ou connectez-vous avec l'email <strong>{info.email}</strong> pour accepter.</p>
                  <Button className="w-full" onClick={handleAccept}>
                    Continuer
                  </Button>
                </>
              ) : user.email !== info.email ? (
                <div className="space-y-2">
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Vous êtes connecté en tant que <strong>{user.email}</strong>. Connectez-vous avec <strong>{info.email}</strong> pour accepter.
                  </p>
                  <Button variant="outline" className="w-full" onClick={async () => { await supabase.auth.signOut(); navigate(`/auth?redirect=/invitation/${token}&email=${encodeURIComponent(info.email ?? "")}`); }}>
                    Changer de compte
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                  {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accepter l'invitation
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
