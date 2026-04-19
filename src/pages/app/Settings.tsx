import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const { restaurant, profile, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [restoForm, setRestoForm] = useState({ name: "", address: "", phone: "" });
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "" });

  useEffect(() => {
    if (restaurant) setRestoForm({
      name: restaurant.name, address: restaurant.address ?? "", phone: restaurant.phone ?? "",
    });
    if (profile) setProfileForm({
      first_name: profile.first_name ?? "", last_name: profile.last_name ?? "",
    });
  }, [restaurant, profile]);

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
    </div>
  );
};

export default Settings;
