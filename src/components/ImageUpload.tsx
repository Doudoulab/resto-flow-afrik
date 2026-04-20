import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bucket: "restaurant-assets" | "menu-images";
  folder: string; // restaurant_id
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: "square" | "wide";
  prefix?: string;
}

export const ImageUpload = ({ bucket, folder, value, onChange, label, aspect = "square", prefix = "" }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Image requise"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${prefix}${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className={`relative overflow-hidden rounded-md border bg-muted ${aspect === "wide" ? "aspect-[3/1]" : "aspect-square w-32"}`}>
        {value ? (
          <>
            <img src={value} alt={label || "image"} className="h-full w-full object-cover" />
            <Button type="button" size="icon" variant="destructive" className="absolute right-1 top-1 h-7 w-7" onClick={() => onChange(null)}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Aucune image</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {value ? "Remplacer" : "Téléverser"}
      </Button>
    </div>
  );
};
