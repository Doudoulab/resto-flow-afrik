import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loginPassword, setLoginPassword] = useState("");

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
    if (!user) return;
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

  const handleSignupAndAccept = async () => {
    if (!info?.email || !token) return;
    if (password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
    setSigningUp(true);
    const { error: signErr } = await supabase.auth.signUp({
      email: info.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/invitation/${token}`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (signErr) {
      setSigningUp(false);
      // If user already exists, switch to login
      if (/already|registered|exists/i.test(signErr.message)) {
        setMode("login");
        toast.info("Ce compte existe déjà — connectez-vous avec votre mot de passe.");
        return;
      }
      toast.error(signErr.message);
      return;
    }
    // Try to sign in immediately (works when email auto-confirm is on)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: info.email,
      password,
    });
    setSigningUp(false);
    if (signInErr) {
      toast.success("Compte créé ! Vérifiez votre email pour confirmer, puis revenez sur ce lien.");
      return;
    }
    // Accept the invitation
    const { data, error } = await supabase.rpc("accept_invitation", { _token: token });
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

  const handleLoginAndAccept = async () => {
    if (!info?.email || !token) return;
    setSigningUp(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: info.email,
      password: loginPassword,
    });
    if (error) {
      setSigningUp(false);
      toast.error("Email ou mot de passe incorrect");
      return;
    }
    const { data, error: accErr } = await supabase.rpc("accept_invitation", { _token: token });
    setSigningUp(false);
    if (accErr) { toast.error(accErr.message); return; }
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
                <div className="space-y-3">
                  <div className="flex gap-2 rounded-md border p-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={`flex-1 rounded py-1.5 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      Créer mon compte
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className={`flex-1 rounded py-1.5 ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      J'ai déjà un compte
                    </button>
                  </div>

                  {mode === "signup" ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="fn">Prénom</Label>
                          <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div>
                          <Label htmlFor="ln">Nom</Label>
                          <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="pw">Mot de passe (6 caractères min.)</Label>
                        <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
                      </div>
                      <Button className="w-full" onClick={handleSignupAndAccept} disabled={signingUp || password.length < 6}>
                        {signingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Créer mon compte et rejoindre
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="lpw">Mot de passe</Label>
                        <Input id="lpw" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                      </div>
                      <Button className="w-full" onClick={handleLoginAndAccept} disabled={signingUp || !loginPassword}>
                        {signingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Se connecter et rejoindre
                      </Button>
                    </>
                  )}
                </div>
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
