import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PagePlaceholder({
  title,
  description,
  comingIn,
}: {
  title: string;
  description: string;
  comingIn: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Under construction</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This section is intentionally a placeholder. {comingIn}
        </CardContent>
      </Card>
    </div>
  );
}
