"use client";

/**
 * Form CRUD Brand Profile (Client Component).
 * - useActionState gọi upsertBrand, hiển thị lỗi/thành công.
 * - Content pillars: danh sách động thêm/xóa, mỗi pillar là 1 input name="pillar".
 */
import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertBrand, type BrandFormState, type BrandView } from "@/app/actions/brand";

const initialState: BrandFormState = { success: false, message: "", errors: {} };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-sm text-destructive" aria-live="polite">
      {messages[0]}
    </p>
  );
}

export function BrandForm({ brand }: { brand: BrandView | null }) {
  const [state, formAction, pending] = useActionState(upsertBrand, initialState);
  const [pillars, setPillars] = useState<string[]>(brand?.pillars ?? []);

  function updatePillar(index: number, value: string) {
    setPillars((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Tên thương hiệu *</Label>
        <Input id="name" name="name" defaultValue={brand?.name ?? ""} />
        <FieldError messages={state.errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Ngành *</Label>
        <Input id="industry" name="industry" defaultValue={brand?.industry ?? ""} />
        <FieldError messages={state.errors.industry} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="products">Sản phẩm / dịch vụ</Label>
        <Textarea id="products" name="products" rows={3} defaultValue={brand?.products ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="toneOfVoice">Tông giọng</Label>
        <Textarea
          id="toneOfVoice"
          name="toneOfVoice"
          rows={2}
          defaultValue={brand?.toneOfVoice ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Đối tượng khách hàng</Label>
        <Textarea id="audience" name="audience" rows={2} defaultValue={brand?.audience ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>Content pillars</Label>
        <div className="space-y-2">
          {pillars.map((pillar, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                name="pillar"
                value={pillar}
                onChange={(e) => updatePillar(i, e.target.value)}
                placeholder="VD: Mẹo sử dụng sản phẩm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Xóa pillar"
                onClick={() => setPillars((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPillars((prev) => [...prev, ""])}
          >
            <Plus />
            Thêm pillar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu brand profile"}
        </Button>
        {state.message && (
          <p
            className={state.success ? "text-sm text-green-600" : "text-sm text-destructive"}
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
