import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftTemplatesManager } from "@/components/schedule/ShiftTemplatesManager";
import { StaffingRequirementsManager } from "@/components/schedule/StaffingRequirementsManager";
import { WeeklyScheduleGrid } from "@/components/schedule/WeeklyScheduleGrid";
import { Loader2 } from "lucide-react";

const Schedule = () => {
  const { restaurant, profile } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh(r => r + 1);

  if (!restaurant) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!profile?.is_owner) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mon planning</h1>
          <p className="mt-1 text-muted-foreground">Vos shifts à venir.</p>
        </div>
        <WeeklyScheduleGrid restaurantId={restaurant.id} refreshKey={refresh} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planning</h1>
        <p className="mt-1 text-muted-foreground">Organisez les shifts hebdomadaires de votre équipe.</p>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grille hebdo</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="needs">Besoins</TabsTrigger>
        </TabsList>
        <TabsContent value="grid" className="space-y-4">
          <WeeklyScheduleGrid restaurantId={restaurant.id} refreshKey={refresh} />
        </TabsContent>
        <TabsContent value="templates" className="space-y-4">
          <ShiftTemplatesManager restaurantId={restaurant.id} onChange={bump} />
        </TabsContent>
        <TabsContent value="needs" className="space-y-4">
          <StaffingRequirementsManager restaurantId={restaurant.id} onChange={bump} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Schedule;
