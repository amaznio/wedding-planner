import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AppStatCardProps = {
  title: string;
  value: string | number;
  hint?: string;
  className?: string;
};

export function AppStatCard({ title, value, hint, className }: AppStatCardProps) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <p className="text-2xl font-semibold text-zinc-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
