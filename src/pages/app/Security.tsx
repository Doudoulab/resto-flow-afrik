import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Copy, KeyRound } from "lucide-react";
import { generateMfaSecret, getOtpAuthUrl, getQrDataUrl, verifyTotp, generateBackupCodes } from "@/lib/security/mfa";

export default function Security() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_mfa").select("enabled").eq("user_id", user.id).maybeSingle();
      setEnabled(!!data?.enabled);
      setLoading(false);
    })();
  }, [user]);

  const beginSetup = async () => {
    if (!user?.email) return;
    const secret = generateMfaSecret();
    const url = getOtpAuthUrl(secret, user.email);
    setSetupSecret(secret);
    setQrUrl(await getQrDataUrl(url));
  };

  const confirmSetup = async () => {
    if (!user || !setupSecret) return;
    if (!verifyTotp(setupSecret, code)) {
      toast.error("Code invalide");
      return;
    }
    const codes = generateBackupCodes();
    const { error } = await supabase.from("user_mfa").upsert({
      user_id: user.id, secret: setupSecret, enabled: true, enabled_at: new Date().toISOString(),
      backup_codes: codes,
    }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    setEnabled(true);
    setBackupCodes(codes);
    setSetupSecret(null); setQrUrl(null); setCode("");
    toast.success("2FA activée");
  };

  const disable = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_mfa").update({ enabled: false }).eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }
    setEnabled(false);
    toast.success("2FA désactivée");
  };

  if (loading) return <div className="p-6 text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sécurité du compte</h1>
        <p className="text-muted-foreground">Authentification à deux facteurs (TOTP)</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Authentification à deux facteurs
            </CardTitle>
            <CardDescription>Protégez votre compte avec une application comme Google Authenticator, Authy ou 1Password.</CardDescription>
          </div>
          <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Activée" : "Inactive"}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!enabled && !setupSecret && (
            <Button onClick={beginSetup}><KeyRound className="mr-2 h-4 w-4" /> Activer la 2FA</Button>
          )}

          {setupSecret && (
            <div className="space-y-3">
              <p className="text-sm">1. Scannez ce QR code avec votre app d'authentification :</p>
              {qrUrl && <img src={qrUrl} alt="QR 2FA" className="border rounded" />}
              <p className="text-sm">Ou saisissez ce code manuellement :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">{setupSecret}</code>
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(setupSecret); toast.success("Copié"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>2. Entrez le code à 6 chiffres généré</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmSetup}>Confirmer</Button>
                <Button variant="outline" onClick={() => { setSetupSecret(null); setQrUrl(null); }}>Annuler</Button>
              </div>
            </div>
          )}

          {enabled && !setupSecret && (
            <Button variant="destructive" onClick={disable}>
              <ShieldOff className="mr-2 h-4 w-4" /> Désactiver la 2FA
            </Button>
          )}

          {backupCodes && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-medium mb-2">Codes de secours (à conserver en sécurité)</p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((c) => <div key={c}>{c}</div>)}
              </div>
              <Button size="sm" variant="outline" className="mt-3"
                onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast.success("Codes copiés"); }}>
                <Copy className="mr-2 h-4 w-4" /> Copier
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}