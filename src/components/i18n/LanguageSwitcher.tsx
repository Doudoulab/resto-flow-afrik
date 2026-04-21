import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from "lucide-react";

const LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select value={i18n.language?.split("-")[0] ?? "fr"} onValueChange={(v) => i18n.changeLanguage(v)}>
        <SelectTrigger className="h-8 w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGS.map((l) => (
            <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}