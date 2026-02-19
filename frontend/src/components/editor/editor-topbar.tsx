"use client";

import {
  Check,
  Copy,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  Moon,
  Save,
  Share2,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import { EDGE_STYLE_LABELS, EDGE_STYLE_OPTIONS, toStoredEdgeStyle } from "@/lib/diagram/edges";
import type { DiagramEdgeType } from "@/lib/diagram/types";
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
  onOpenChat: () => void;
  onOpenTemplates: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  exportBackground: ExportBackground;
  onExportBackgroundChange: (value: ExportBackground) => void;
  edgeStyle: DiagramEdgeType;
  onEdgeStyleChange: (value: DiagramEdgeType) => void;
  edgeAnimated: boolean;
  onEdgeAnimatedChange: (value: boolean) => void;
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
  onOpenChat,
  onOpenTemplates,
  onExportPng,
  onExportSvg,
  exportBackground,
  onExportBackgroundChange,
  edgeStyle,
  onEdgeStyleChange,
  edgeAnimated,
  onEdgeAnimatedChange,
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
  const disableEdgeControls = !activePageId || isPageDisabled;
  const { theme, setTheme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <TooltipProvider>
      <header className="flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/80 px-3 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80 sm:px-5">
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Diagram title"
          className="h-9 w-[180px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-zinc-300 focus:bg-white dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-900 sm:w-[240px] lg:w-[320px]"
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
            saveStatus === "error" ? "text-red-600" : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          {formatSaveMeta(saveStatus, lastSavedAt)}
        </span>

        {isDirty ? (
          <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200 xl:inline">
            Unsaved changes
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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

          <ButtonGroup className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] dark:border-zinc-700 dark:bg-zinc-900 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onExportPng}
                  disabled={disableExport || isExportingPng}
                  className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5 dark:text-zinc-200"
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
                  className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5 dark:text-zinc-200"
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
                      className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5 dark:text-zinc-200"
                      aria-label="Connector style"
                      disabled={disableEdgeControls}
                    >
                      <GitBranch className="size-4" />
                      Connector
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Set connector style</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={edgeStyle}
                  onValueChange={(value) => onEdgeStyleChange(toStoredEdgeStyle(value))}
                >
                  {EDGE_STYLE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {EDGE_STYLE_LABELS[option]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdgeAnimatedChange(!edgeAnimated)}
                  disabled={disableEdgeControls}
                  className={cn(
                    "h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5 dark:text-zinc-200",
                    edgeAnimated && "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900"
                  )}
                  aria-label="Toggle animated connectors"
                >
                  Animated
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle connector animation</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-none px-2.5 text-zinc-700 transition-transform duration-200 hover:-translate-y-0.5 dark:text-zinc-200"
                      aria-label="Export background"
                      disabled={disableExport}
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                className="h-8 w-8 rounded-lg border-zinc-200 bg-white text-zinc-700 shadow-[0_8px_20px_-20px_rgba(15,23,42,0.7)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {isDarkTheme ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
            </TooltipContent>
          </Tooltip>

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-8 rounded-lg border border-emerald-700 bg-emerald-600 text-white shadow-[0_12px_28px_-18px_rgba(5,150,105,0.95)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:bg-emerald-700",
                      "focus-visible:ring-2 focus-visible:ring-emerald-500",
                      "dark:border-emerald-300 dark:bg-emerald-400 dark:text-zinc-950 dark:hover:bg-emerald-300",
                      !shareUrl && "opacity-60"
                    )}
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
            <PopoverContent
              align="end"
              className="w-[320px] space-y-4 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <PopoverHeader>
                <PopoverTitle>Share Link</PopoverTitle>
              </PopoverHeader>
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Public access</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              "h-8 rounded-lg border border-fuchsia-700 bg-fuchsia-600 text-white shadow-[0_12px_30px_-18px_rgba(192,38,211,0.95)]",
              "hover:bg-fuchsia-500 active:bg-fuchsia-700",
              "focus-visible:ring-2 focus-visible:ring-fuchsia-500",
              "dark:border-fuchsia-300 dark:bg-fuchsia-400 dark:text-zinc-950 dark:hover:bg-fuchsia-300",
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
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border border-amber-700 bg-amber-500 text-zinc-950 shadow-[0_12px_26px_-18px_rgba(245,158,11,0.95)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-400 active:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-300 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            aria-label="Open chat panel"
            onClick={onOpenChat}
          >
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Chat</span>
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}

export type { ExportBackground, SaveStatus };
