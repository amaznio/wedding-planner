import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppSectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 rounded-lg py-0 shadow-sm", className)}>
      <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
        <CardTitle className="text-lg leading-6">{title}</CardTitle>
        {description ? <CardDescription className="mt-1 leading-6">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}
