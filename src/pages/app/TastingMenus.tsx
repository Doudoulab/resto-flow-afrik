import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChefHat, Wine as WineIcon, Clock, GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";

interface TastingMenu {
  id: string; name: string; description: string | null;
  price_per_person: number; wine_pairing_price: number;
  estimated_duration_min: number; min_party_size: number; is_active: boolean;
}
interface Course {
  id: string; tasting_menu_id: string; menu_item_id: string | null; wine_id: string | null;
  course_order: number; course_label: string | null; cooking_time_min: number;
  custom_name: string | null; custom_description: string | null;
}
interface MenuItemLite { id: string; name: string }
interface WineLite { id: string; name: string; vintage: number | null }

const COURSE_LABELS = ["Mise en bouche", "Entrée", "Poisson", "Viande", "Fromage", "Pré-dessert", "Dessert", "Mignardises"];

const empty = { name: "", description: "", price_per_person: "0", wine_pairing_price: "0", estimated_duration_min: "120", min_party_size: "2", is_active: true };

const TastingMenus = () => {
  const { restaurant } = useAuth();
  const [menus, setMenus] = useState<TastingMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TastingMenu | null>(null);
  const [form, setForm] = useState(empty);

  const [coursesOpen, setCoursesOpen] = useState(false);
  const [coursesMenu, setCoursesMenu] = useState<TastingMenu | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);
  const [wines, setWines] = useState<WineLite[]>([]);

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase.from("tasting_menus").select("*").eq("restaurant_id", restaurant.id).order("name");
    setMenus((data ?? []) as TastingMenu[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const openCreate = () => { setEditing(null); setForm(empty); setEditOpen(true); };
  const openEdit = (m: TastingMenu) => {
    setEditing(m);
    setForm({
      name: m.name, description: m.description ?? "",
      price_per_person: String(m.price_per_person), wine_pairing_price: String(m.wine_pairing_price),
      estimated_duration_min: String(m.estimated_duration_min), min_party_size: String(m.min_party_size),
      is_active: m.is_active,
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!restaurant) return;
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const payload = {
      restaurant_id: restaurant.id,
      name: form.name.trim(), description: form.description.trim() || null,
      price_per_person: parseFloat(form.price_per_person) || 0,
      wine_pairing_price: parseFloat(form.wine_pairing_price) || 0,
      estimated_duration_min: parseInt(form.estimated_duration_min, 10) || 120,
      min_party_size: parseInt(form.min_party_size, 10) || 2,
      is_active: form.is_active,
    };
    const res = editing
      ? await supabase.from("tasting_menus").update(payload).eq("id", editing.id)
      : await supabase.from("tasting_menus").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Menu mis à jour" : "Menu créé");
    setEditOpen(false);
    load();
  };

  const remove = async (m: TastingMenu) => {
    if (!confirm(`Supprimer "${m.name}" et tous ses services ?`)) return;
    const { error } = await supabase.from("tasting_menus").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Menu supprimé");
    load();
  };

  const openCourses = async (m: TastingMenu) => {
    if (!restaurant) return;
    setCoursesMenu(m);
    const [c, mi, wi] = await Promise.all([
      supabase.from("tasting_menu_courses").select("*").eq("tasting_menu_id", m.id).order("course_order"),
      supabase.from("menu_items").select("id,name").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("wines").select("id,name,vintage").eq("restaurant_id", restaurant.id).order("name"),
    ]);
    setCourses((c.data ?? []) as Course[]);
    setMenuItems((mi.data ?? []) as MenuItemLite[]);
    setWines((wi.data ?? []) as WineLite[]);
    setCoursesOpen(true);
  };

  const addCourse = async () => {
    if (!restaurant || !coursesMenu) return;
    const nextOrder = (courses[courses.length - 1]?.course_order ?? 0) + 1;
    const label = COURSE_LABELS[Math.min(nextOrder - 1, COURSE_LABELS.length - 1)];
    const { data, error } = await supabase.from("tasting_menu_courses").insert({
      restaurant_id: restaurant.id, tasting_menu_id: coursesMenu.id,
      course_order: nextOrder, course_label: label, cooking_time_min: 10,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setCourses([...courses, data as Course]);
  };

  const updateCourse = async (id: string, patch: Partial<Course>) => {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
    const { error } = await supabase.from("tasting_menu_courses").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const removeCourse = async (id: string) => {
    const { error } = await supabase.from("tasting_menu_courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const moveCourse = async (id: string, dir: -1 | 1) => {
    const idx = courses.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= courses.length) return;
    const a = courses[idx], b = courses[target];
    await Promise.all([
      supabase.from("tasting_menu_courses").update({ course_order: b.course_order }).eq("id", a.id),
      supabase.from("tasting_menu_courses").update({ course_order: a.course_order }).eq("id", b.id),
    ]);
    if (coursesMenu) openCourses(coursesMenu);
  };

  const totalDuration = courses.reduce((s, c) => s + c.cooking_time_min, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" /> Menus dégustation
          </h1>
          <p className="text-sm text-muted-foreground">Séquencer plats + accords vins + timing cuisine.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau menu</Button>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> : menus.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun menu dégustation. Créez-en un pour proposer une expérience signature.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {menus.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{m.name}</CardTitle>
                    {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                  </div>
                  <Badge variant={m.is_active ? "default" : "outline"}>{m.is_active ? "Actif" : "Brouillon"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="font-bold text-primary">{formatFCFA(m.price_per_person)} / pers.</span>
                  {m.wine_pairing_price > 0 && (
                    <span className="text-muted-foreground">+ {formatFCFA(m.wine_pairing_price)} accords</span>
                  )}
                  <span className="text-muted-foreground">· {m.estimated_duration_min} min · min {m.min_party_size} pers.</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openCourses(m)}>
                    <ChefHat className="mr-2 h-4 w-4" /> Composer les services
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit menu dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau"} menu dégustation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Menu Découverte 7 services" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix / personne</Label><Input type="number" value={form.price_per_person} onChange={(e) => setForm({ ...form, price_per_person: e.target.value })} /></div>
              <div><Label>Accords vins (sup.)</Label><Input type="number" value={form.wine_pairing_price} onChange={(e) => setForm({ ...form, wine_pairing_price: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Durée estimée (min)</Label><Input type="number" value={form.estimated_duration_min} onChange={(e) => setForm({ ...form, estimated_duration_min: e.target.value })} /></div>
              <div><Label>Min couverts</Label><Input type="number" value={form.min_party_size} onChange={(e) => setForm({ ...form, min_party_size: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Actif (proposable aux clients)</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Courses dialog */}
      <Dialog open={coursesOpen} onOpenChange={setCoursesOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Services — {coursesMenu?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Total cuisine estimé : {totalDuration} min
            </p>
          </DialogHeader>
          <div className="space-y-2">
            {courses.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Ajoutez des services pour composer votre menu.</p>
            )}
            {courses.map((c, idx) => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button onClick={() => moveCourse(c.id, -1)} disabled={idx === 0} className="text-xs disabled:opacity-30">▲</button>
                      <button onClick={() => moveCourse(c.id, 1)} disabled={idx === courses.length - 1} className="text-xs disabled:opacity-30">▼</button>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">#{c.course_order}</Badge>
                    <Input
                      className="flex-1"
                      placeholder="Libellé (ex: Entrée)"
                      value={c.course_label ?? ""}
                      onChange={(e) => updateCourse(c.id, { course_label: e.target.value })}
                    />
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="number" className="w-16" min="1"
                        value={c.cooking_time_min}
                        onChange={(e) => updateCourse(c.id, { cooking_time_min: parseInt(e.target.value, 10) || 10 })}
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeCourse(c.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-12">
                    <div>
                      <Label className="text-xs flex items-center gap-1"><ChefHat className="h-3 w-3" /> Plat</Label>
                      <Select value={c.menu_item_id ?? ""} onValueChange={(v) => updateCourse(c.id, { menu_item_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Choisir un plat…" /></SelectTrigger>
                        <SelectContent>
                          {menuItems.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><WineIcon className="h-3 w-3" /> Vin associé</Label>
                      <Select value={c.wine_id ?? ""} onValueChange={(v) => updateCourse(c.id, { wine_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Sans accord…" /></SelectTrigger>
                        <SelectContent>
                          {wines.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}{w.vintage ? ` ${w.vintage}` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={addCourse}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un service
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TastingMenus;