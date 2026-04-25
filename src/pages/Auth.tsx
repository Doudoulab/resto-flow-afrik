import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChefHat, Loader2, UserRoundCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const demoCredentials: Record<string, { label: string; email: string; password: string }> = {
  "gérant": { label: "Gérant", email: "demo@restoflow.africa", password: "DemoResto2026!" },
  gerant: { label: "Gérant", email: "demo@restoflow.africa", password: "DemoResto2026!" },
  serveur: { label: "Serveur", email: "serveur@restoflow.africa", password: "DemoResto2026!" },
  cuisine: { label: "Cuisine", email: "cuisine@restoflow.africa", password: "DemoResto2026!" },
  caisse: { label: "Caisse", email: "caisse@restoflow.africa", password: "DemoResto2026!" },
};

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(
    params.get("mode") === "signup" ? "signup" : "signin"
  );
  const [loading, setLoading] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    restaurantName: "",
  });

  useEffect(() => {
    const demo = params.get("demo")?.toLowerCase();
    const credentials = demo ? demoCredentials[demo] : null;
    if (!credentials) return;
    setTab("signin");
    setSignInData({ email: credentials.email, password: credentials.password });
    toast.info(`Compte démo ${credentials.label} prêt à utiliser`);
  }, [params]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect"
        : error.message);
      return;
    }
    toast.success("Bienvenue !");
    navigate("/app");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/app`;
    const { error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: signUpData.firstName,
          last_name: signUpData.lastName,
          restaurant_name: signUpData.restaurantName,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Cet email est déjà utilisé"
          : error.message
      );
      return;
    }
    toast.success("Compte créé avec succès !");
    navigate("/app");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">RestoFlow</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg md:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="mb-1 text-2xl font-bold">Bon retour !</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Connectez-vous à votre espace RestoFlow.
              </p>
              <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2 font-medium text-primary">
                  <UserRoundCheck className="h-4 w-4" /> Accès démo rapide
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(demoCredentials).filter(([key]) => key !== "gerant").map(([key, demo]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSignInData({ email: demo.email, password: demo.password })}
                    >
                      {demo.label}
                    </Button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    required
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    placeholder="vous@restaurant.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    required
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="mb-1 text-2xl font-bold">Créez votre restaurant</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Quelques secondes pour démarrer. C'est gratuit.
              </p>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">Prénom</Label>
                    <Input
                      id="signup-firstname"
                      required
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Nom</Label>
                    <Input
                      id="signup-lastname"
                      required
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-resto">Nom du restaurant</Label>
                  <Input
                    id="signup-resto"
                    required
                    placeholder="Le Baobab"
                    value={signUpData.restaurantName}
                    onChange={(e) => setSignUpData({ ...signUpData, restaurantName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    placeholder="vous@restaurant.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={6}
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer mon compte
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Retour à l'accueil</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
