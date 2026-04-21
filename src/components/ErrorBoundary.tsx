import { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "@/lib/monitoring/logger";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {this.state.error?.message ?? "Erreur inconnue"}. L'incident a été enregistré.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={this.reset} variant="outline">Réessayer</Button>
          <Button onClick={() => (window.location.href = "/app")}>Retour</Button>
        </div>
      </div>
    );
  }
}