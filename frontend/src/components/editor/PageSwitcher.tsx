"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PageSwitcherProps = {
  pages: Array<{ id: string; name: string }>;
  activePageId: string | null;
  onPageChange: (pageId: string) => void;
  onAddPage: () => void;
  disabled?: boolean;
};

export function PageSwitcher({
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  disabled,
}: PageSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={activePageId ?? undefined}
        onValueChange={onPageChange}
        disabled={disabled || pages.length === 0}
      >
        <SelectTrigger
          size="sm"
          className="h-9 min-w-[160px] border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          aria-label="Select page"
        >
          <SelectValue placeholder="Select page" />
        </SelectTrigger>
        <SelectContent>
          {pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              {page.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={onAddPage}
        className="h-9 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        disabled={disabled}
      >
        <Plus className="size-4" />
        New Page
      </Button>
    </div>
  );
}
