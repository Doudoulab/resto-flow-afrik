import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, restaurant, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (restaurant?.suspended_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-lg">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Compte suspendu</h1>
          <p className="text-muted-foreground mb-4">
            L'accès à votre restaurant <strong>{restaurant.name}</strong> a été suspendu par l'administration de la plateforme.
          </p>
          {restaurant.suspended_reason && (
            <div className="rounded-md bg-muted p-3 text-sm text-left mb-4">
              <span className="font-medium">Raison :</span> {restaurant.suspended_reason}
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-6">
            Contactez le support pour régulariser votre situation.
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
