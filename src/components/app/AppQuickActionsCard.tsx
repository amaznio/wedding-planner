import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppQuickActionsCardAction = {
  id: string;
  label: string;
  action: ReactNode;
};

type AppQuickActionsCardProps = {
  title: string;
  actions: AppQuickActionsCardAction[];
};

export function AppQuickActionsCard({ title, actions }: AppQuickActionsCardProps) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pb-5 sm:grid-cols-2">
        {actions.map((item) => (
          <div key={item.id}>
            <p className="mb-1 text-xs text-zinc-500">{item.label}</p>
            {item.action}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
