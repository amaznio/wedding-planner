import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AppEmptyStateProps = {
  title: string;
  description?: string;
};

export function AppEmptyState({ title, description }: AppEmptyStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent />
    </Card>
  );
}
