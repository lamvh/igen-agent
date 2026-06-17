import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Content Creator</h1>
      <p className="mt-2 text-muted-foreground">
        Sinh nội dung + quản lý lịch đăng cho thương hiệu của bạn.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/brand" className="block transition-opacity hover:opacity-80">
          <Card>
            <CardHeader>
              <CardTitle>Brand Profile</CardTitle>
              <CardDescription>Thiết lập thương hiệu</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Thiết lập ngay →</CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Ý tưởng & Caption</CardTitle>
            <CardDescription>Sinh nội dung bằng AI (Phase 3)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Sắp có</CardContent>
        </Card>
      </div>
    </main>
  );
}
