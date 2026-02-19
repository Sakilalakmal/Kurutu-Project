"use client";

import {
  Check,
  Copy,
  Image as ImageIcon,
  MessageSquare,
  Save,
  Share2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { PageSwitcher } from "@/components/editor/PageSwitcher";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ExportBackground = "transparent" | "white";

type EditorTopbarProps = {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
  pages: Array<{ id: string; name: string }>;
  activePageId: string | null;
  onPageChange: (pageId: string) => void;
  onAddPage: () => void;
  isPageDisabled?: boolean;
  onOpenMobileChat: () => void;
  onOpenTemplates: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  exportBackground: ExportBackground;
  onExportBackgroundChange: (value: ExportBackground) => void;
  isExportingPng: boolean;
  isExportingSvg: boolean;
  shareUrl: string | null;
  isPublic: boolean;
  isUpdatingShare: boolean;
  onToggleShare: (isPublic: boolean) => void;
  onCopyShareUrl: () => void;
  isCopyShareSuccess: boolean;
};

const formatSaveMeta = (status: SaveStatus, savedAt: string | null) => {
  if (status === "saving") {
    return "Saving...";
  }

  if (status === "error") {
    return "Save failed";
  }

  if (status === "saved" && savedAt) {
    const timestamp = new Date(savedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `Saved ${timestamp}`;
  }

  return "Ready";
};

export function EditorTopbar({
  title,
  onTitleChange,
  onSave,
  saveStatus,
  lastSavedAt,
  isDirty,
  pages,
  activePageId,
  onPageChange,
  onAddPage,
  isPageDisabled,
  onOpenMobileChat,
  onOpenTemplates,
  onExportPng,
  onExportSvg,
  exportBackground,
  onExportBackgroundChange,
  isExportingPng,
  isExportingSvg,
  shareUrl,
  isPublic,
  isUpdatingShare,
  onToggleShare,
  onCopyShareUrl,
  isCopyShareSuccess,
}: EditorTopbarProps) {
  const disableExport = !activePageId || isPageDisabled;

  return (
    <TooltipProvider>
      <header className="flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-3 backdrop-blur sm:px-5">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Diagram title"
          className="h-9 w-[180px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-zinc-300 focus:bg-white sm:w-[240px] lg:w-[320px]"
        />
        <div className="hidden lg:block">
          <PageSwitcher
            pages={pages}
            activePageId={activePageId}
            onPageChange={onPageChange}
            onAddPage={onAddPage}
            disabled={isPageDisabled}
          />
        </div>

        <span
          className={cn(
            "hidden text-xs xl:inline",
            saveStatus === "error" ? "text-red-600" : "text-zinc-500"
          )}
        >
          {formatSaveMeta(saveStatus, lastSavedAt)}
        </span>

        {isDirty ? (
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 xl:inline">
            Unsaved changes
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] transition-transform duration-200 hover:-translate-y-0.5"
                onClick={onOpenTemplates}
                aria-label="Open templates"
                disabled={isPageDisabled}
              >
                <WandSparkles className="size-4" />
                <span className="hidden md:inline">Templates</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Create a new page from template</TooltipContent>
          </Tooltip>

          <ButtonGroup className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onExportPng}
                  disabled={disableExport || isExportingPng}
                  className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5"
                  aria-label="Export PNG"
                >
                  <ImageIcon className="size-4" />
                  PNG
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export current page as PNG</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onExportSvg}
                  disabled={disableExport || isExportingSvg}
                  className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5"
                  aria-label="Export SVG"
                >
                  <Sparkles className="size-4" />
                  SVG
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export current page as SVG</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5"
                      aria-label="Export background"
                    >
                      BG
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Set export background</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={exportBackground}
                  onValueChange={(value) =>
                    onExportBackgroundChange(
                      value === "white" ? "white" : "transparent"
                    )
                  }
                >
                  <DropdownMenuRadioItem value="transparent">
                    Transparent
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="white">White</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] transition-transform duration-200 hover:-translate-y-0.5"
                    aria-label="Share diagram"
                    disabled={!shareUrl}
                  >
                    <Share2 className="size-4" />
                    Share
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle public link</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-[320px] space-y-4">
              <PopoverHeader>
                <PopoverTitle>Share Link</PopoverTitle>
              </PopoverHeader>
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Public access</p>
                  <p className="text-xs text-zinc-500">
                    Anyone with the link can view this page.
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={onToggleShare}
                  disabled={isUpdatingShare || !shareUrl}
                  aria-label="Toggle public link"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={shareUrl ?? ""}
                  readOnly
                  className="h-9 text-xs"
                  aria-label="Share URL"
                />
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={onCopyShareUrl}
                  disabled={!shareUrl}
                  aria-label="Copy share URL"
                >
                  {isCopyShareSuccess ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <AvatarGroup className="hidden xl:flex">
            <Avatar size="sm">
              <AvatarFallback>AZ</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>WL</AvatarFallback>
            </Avatar>
            <Avatar size="sm">
              <AvatarFallback>MI</AvatarFallback>
            </Avatar>
          </AvatarGroup>

          <Button
            size="sm"
            variant="default"
            className={cn(
              "h-8 rounded-lg border border-blue-700 bg-blue-600 text-white shadow-[0_12px_30px_-18px_rgba(37,99,235,0.9)]",
              "hover:bg-blue-500 active:bg-blue-700",
              "focus-visible:ring-2 focus-visible:ring-blue-500",
              saveStatus === "saving" && "cursor-not-allowed opacity-80"
            )}
            onClick={onSave}
            aria-label="Save diagram"
            disabled={saveStatus === "saving"}
          >
            <Save className="size-4" />
            {saveStatus === "saving" ? "Saving" : "Save"}
          </Button>

          <Button
            size="icon-sm"
            variant="outline"
            className="h-8 w-8 rounded-lg border-zinc-200 bg-white lg:hidden"
            aria-label="Open chat panel"
            onClick={onOpenMobileChat}
          >
            <MessageSquare className="size-4" />
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}

export type { ExportBackground, SaveStatus };
