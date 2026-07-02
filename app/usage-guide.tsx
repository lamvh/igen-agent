/**
 * Hướng dẫn sử dụng — hiển thị trên trang Tổng quan (/).
 * Các bước theo đúng luồng làm việc: brand → ý tưởng → caption → lịch → đăng.
 */
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Step = {
  title: string;
  href: string;
  detail: string;
};

const STEPS: Step[] = [
  {
    title: "Thiết lập Brand Profile",
    href: "/settings?tab=brand",
    detail: "Tên, ngành, tông giọng, content pillars — làm ngữ cảnh cho mọi nội dung sinh ra.",
  },
  {
    title: "Sinh ý tưởng",
    href: "/ideas",
    detail:
      "Chọn content pillar + nền tảng để AI gợi ý tiêu đề. Không có API key vẫn dùng được: nhập ý tưởng thủ công hoặc copy prompt dán sang Claude app / AI khác.",
  },
  {
    title: "Tạo caption từ ý tưởng",
    href: "/ideas",
    detail: "Mỗi nền tảng (Facebook / Instagram / TikTok / Blog) một bản nháp riêng, đúng văn phong nền tảng.",
  },
  {
    title: "Soạn & lên lịch",
    href: "/posts",
    detail: "Mở bài trong trình soạn thảo: chỉnh caption + hashtags, gắn ảnh từ Thư viện ảnh, gán ngày đăng.",
  },
  {
    title: "Đăng bài theo lịch",
    href: "/calendar",
    detail:
      "Đến ngày đăng, mở Lịch nội dung, bấm Copy để lấy caption + hashtags rồi đăng thủ công lên nền tảng, sau đó đổi trạng thái thành “Đã đăng”.",
  },
];

export function UsageGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hướng dẫn sử dụng</CardTitle>
        <CardDescription>Luồng làm việc từ ý tưởng đến bài đăng, theo 5 bước.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="text-sm">
                <Link
                  href={step.href}
                  className="font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  {step.title}
                </Link>
                <p className="mt-0.5 text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
