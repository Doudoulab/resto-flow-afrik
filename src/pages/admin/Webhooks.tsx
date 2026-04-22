import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Webhook } from "lucide-react";

export default function Webhooks() {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const logsUrl = `https://supabase.com/dashboard/project/${projectId}/functions/payments-webhook/logs`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhooks Paddle</h1>
        <p className="text-muted-foreground mt-1">Surveillance des événements de paiement</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Edge function payments-webhook</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Les webhooks Paddle (sandbox + live) sont reçus par l'edge function <code className="bg-muted px-1.5 py-0.5 rounded">payments-webhook</code> et synchronisent automatiquement la table subscriptions.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Événements écoutés :</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• subscription.created</li>
              <li>• subscription.updated</li>
              <li>• subscription.canceled</li>
              <li>• transaction.completed</li>
              <li>• transaction.payment_failed</li>
            </ul>
          </div>
          <Button variant="outline" asChild>
            <a href={logsUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Voir les logs en direct
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}