import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const services = [
  { name: "Web application", status: "operational" },
  { name: "Publishing & scheduling", status: "operational" },
  { name: "AI generation", status: "operational" },
  { name: "Payments (USDT / PayPal / GCash)", status: "operational" },
];

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold">System status</h1>
        <p className="mt-2 text-muted-foreground">All systems operational</p>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{s.name}</span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Operational
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="mt-6 text-center">
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
