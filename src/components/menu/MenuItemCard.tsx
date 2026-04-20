import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChefHat, Pencil, Trash2, Layers } from "lucide-react";
import { formatFCFA } from "@/lib/currency";

export interface MenuItemLite {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
  image_url: string | null;
}

interface Props {
  item: MenuItemLite;
  onEdit: (i: MenuItemLite) => void;
  onDelete: (id: string) => void;
  onToggle: (i: MenuItemLite) => void;
  onRecipe: (i: MenuItemLite) => void;
  onVariants: (i: MenuItemLite) => void;
}

export const MenuItemCard = ({ item, onEdit, onDelete, onToggle, onRecipe, onVariants }: Props) => (
  <Card className="shadow-sm">
    <div className="aspect-video w-full overflow-hidden bg-muted">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Pas de photo</div>
      )}
    </div>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{item.name}</h3>
          {item.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          <p className="mt-2 text-lg font-bold text-primary">{formatFCFA(item.price)}</p>
        </div>
        <Switch checked={item.is_available} onCheckedChange={() => onToggle(item)} />
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onVariants(item)} title="Variantes & suppléments">
          <Layers className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRecipe(item)} title="Recette">
          <ChefHat className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </CardContent>
  </Card>
);