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
    <Card className={cn("min-h-24 gap-0 rounded-lg py-0 shadow-sm", className)}>
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="text-sm font-medium leading-5 text-zinc-600">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <p className="text-2xl font-semibold leading-8 text-zinc-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
