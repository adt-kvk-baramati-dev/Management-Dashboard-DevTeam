import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function DashboardCard({ title, description, children, className }: DashboardCardProps) {
  return (
    <Card className={cn("rounded-xl border border-border/70 bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        {description ? <CardDescription className="text-muted-foreground">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="text-foreground">{children}</CardContent>
    </Card>
  );
}
