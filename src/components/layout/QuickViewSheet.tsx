import { createContext, useContext, useState, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface QuickViewState {
  open: (title: string, content: ReactNode, description?: string) => void;
  close: () => void;
}

const Ctx = createContext<QuickViewState | null>(null);

export const useQuickView = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useQuickView must be inside QuickViewProvider");
  return c;
};

export const QuickViewProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | undefined>();
  const [content, setContent] = useState<ReactNode>(null);

  const api: QuickViewState = {
    open: (t, c, d) => { setTitle(t); setContent(c); setDescription(d); setOpen(true); },
    close: () => setOpen(false),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="mt-6">{content}</div>
        </SheetContent>
      </Sheet>
    </Ctx.Provider>
  );
};
