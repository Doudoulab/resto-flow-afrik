import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";
import { RestaurantCustomization } from "@/components/settings/RestaurantCustomization";
import { OperatorsManager } from "@/components/payments/OperatorsManager";

interface RestaurantTable {
  id: string;
  label: string;
  seats: number;
  sort_order: number;
}

const Settings = () => {
  const { restaurant, profile, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [restoForm, setRestoForm] = useState({ name: "", address: "", phone: "" });
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "" });
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [tableForm, setTableForm] = useState({ label: "", seats: 4 });

  useEffect(() => {
    if (restaurant) setRestoForm({
      name: restaurant.name, address: restaurant.address ?? "", phone: restaurant.phone ?? "",
    });
    if (profile) setProfileForm({
      first_name: profile.first_name ?? "", last_name: profile.last_name ?? "",
    });
  }, [restaurant, profile]);

  useEffect(() => {
    const loadTables = async () => {
      if (!restaurant) return;
      const { data } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order")
        .order("label");
      setTables((data ?? []) as RestaurantTable[]);
    };
    loadTables();
  }, [restaurant]);

  const reloadTables = async () => {
    if (!restaurant) return;
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order")
      .order("label");
    setTables((data ?? []) as RestaurantTable[]);
  };

  const addTable = async () => {
    if (!restaurant || !tableForm.label.trim()) {
      toast.error("Libellé requis");
      return;
    }
    const { error } = await supabase.from("restaurant_tables").insert({
      restaurant_id: restaurant.id,
      label: tableForm.label.trim(),
      seats: tableForm.seats,
      sort_order: tables.length,
    });
    if (error) { toast.error(error.message); return; }
    setTableForm({ label: "", seats: 4 });
    reloadTables();
  };

  const removeTable = async (id: string) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    reloadTables();
  };

  const saveRestaurant = async () => {
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      name: restoForm.name,
      address: restoForm.address || null,
      phone: restoForm.phone || null,
    }).eq("id", restaurant.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Restaurant mis à jour");
    refresh();
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
    }).eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil mis à jour");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="mt-1 text-muted-foreground">Gérez votre restaurant et votre profil.</p>
      </div>

      {profile?.is_owner && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle>Restaurant</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du restaurant</Label>
              <Input value={restoForm.name} onChange={(e) => setRestoForm({ ...restoForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={restoForm.address} onChange={(e) => setRestoForm({ ...restoForm, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={restoForm.phone} onChange={(e) => setRestoForm({ ...restoForm, phone: e.target.value })} />
            </div>
            <Button onClick={saveRestaurant} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </CardContent>
        </Card>
      )}

      {profile?.is_owner && restaurant && (
        <RestaurantCustomization restaurant={restaurant} onSaved={refresh} />
      )}

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Mon profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </CardContent>
      </Card>

      {profile?.is_owner && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tables de la salle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px] space-y-2">
                <Label>Libellé (ex: T1, Terrasse 2)</Label>
                <Input
                  value={tableForm.label}
                  onChange={(e) => setTableForm({ ...tableForm, label: e.target.value })}
                  placeholder="T1"
                />
              </div>
              <div className="w-24 space-y-2">
                <Label>Couverts</Label>
                <Input
                  type="number"
                  min={1}
                  value={tableForm.seats}
                  onChange={(e) => setTableForm({ ...tableForm, seats: parseInt(e.target.value) || 1 })}
                />
              </div>
              <Button onClick={addTable}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>

            {tables.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucune table configurée. Ajoutez-en pour activer le mode salle.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {tables.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border bg-card p-3">
                    <div>
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.seats} couverts</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeTable(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {restaurant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> QR Code Menu (commande à table)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Imprimez et collez ce QR code sur chaque table. Vos clients pourront consulter le menu et passer commande directement depuis leur téléphone.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label>Lien général du menu</Label>
                  <Input readOnly value={`${window.location.origin}/m/${restaurant.id}`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pour un QR par table, ajoutez <code>?table=NUMERO</code> à la fin du lien.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-md border bg-card p-4">
                <QRCodeSVG id="resto-qr" value={`${window.location.origin}/m/${restaurant.id}`} size={180} includeMargin />
                <Button variant="outline" size="sm" onClick={() => {
                  const svg = document.getElementById("resto-qr") as unknown as SVGElement | null;
                  if (!svg) return;
                  const data = new XMLSerializer().serializeToString(svg);
                  const blob = new Blob([data], { type: "image/svg+xml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `qr-menu-${restaurant.name}.svg`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="mr-2 h-4 w-4" /> Télécharger
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {restaurant && profile?.is_owner && (
        <OperatorsManager
          restaurantId={restaurant.id}
          initialCountry={restaurant.country_code}
        />
      )}
    </div>
  );
};

export default Settings;
