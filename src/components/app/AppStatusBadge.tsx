import { Badge } from "@/components/ui/badge";

export function AppStatusBadge({ label, variant = "default" }: { label: string; variant?: "default" | "secondary" | "success" }) {
  return <Badge variant={variant}>{label}</Badge>;
}
