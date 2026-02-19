"use client";

import { WandSparkles } from "lucide-react";
import type { TemplateDefinition } from "@/lib/assets/templates";
import { getTemplatePreview } from "@/lib/assets/preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateDefinition[];
  onUseTemplate: (templateId: string) => void;
  disabled?: boolean;
};

function PreviewSvg({ templateId }: { templateId: string }) {
  const preview = getTemplatePreview(templateId);

  if (preview.kind === "wireframe") {
    return (
      <svg viewBox={preview.viewBox} className="h-full w-full" aria-hidden="true">
        <rect x="12" y="10" width="296" height="30" rx="7" fill="#f4f4f5" stroke="#d4d4d8" />
        <rect x="12" y="52" width="74" height="112" rx="7" fill="#fafafa" stroke="#d4d4d8" />
        <rect x="98" y="52" width="120" height="78" rx="7" fill="#ffffff" stroke="#d4d4d8" />
        <rect x="228" y="52" width="80" height="48" rx="7" fill="#ffffff" stroke="#d4d4d8" />
        <rect x="98" y="136" width="96" height="20" rx="6" fill="#f4f4f5" stroke="#d4d4d8" />
        <rect x="202" y="136" width="60" height="20" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
      </svg>
    );
  }

  return (
    <svg viewBox={preview.viewBox} className="h-full w-full" aria-hidden="true">
      <ellipse cx="36" cy="86" rx="26" ry="16" fill="#ecfeff" stroke="#67e8f9" />
      <rect x="82" y="70" width="72" height="32" rx="8" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="182" y="66" width="82" height="40" rx="8" fill="#f8fafc" stroke="#94a3b8" />
      <rect x="182" y="126" width="82" height="32" rx="8" fill="#f8fafc" stroke="#bfdbfe" />
      <ellipse cx="302" cy="86" rx="14" ry="10" fill="#eef2ff" stroke="#a5b4fc" />
      <path
        d="M62 86 H82 M154 86 H182 M264 76 H302 M264 142 H302"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
      />
    </svg>
  );
}

export function TemplatesDialog({
  open,
  onOpenChange,
  templates,
  onUseTemplate,
  disabled = false,
}: TemplatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <WandSparkles className="size-4 text-blue-600" />
            Templates
          </DialogTitle>
          <DialogDescription>
            Pick a starter layout. Using a template creates a new page and keeps your current
            page untouched.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <Card
              key={template.id}
                className="overflow-hidden border-zinc-200 bg-white shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-30px_rgba(15,23,42,0.6)] dark:border-zinc-700 dark:bg-zinc-900"
              >
              <div className="h-36 border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white p-3 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900">
                <PreviewSvg templateId={template.id} />
              </div>
              <div className="space-y-3 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {template.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{template.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                    {template.category}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => onUseTemplate(template.id)}
                    disabled={disabled}
                    className="h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`Use ${template.name} template`}
                  >
                    Use template
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
