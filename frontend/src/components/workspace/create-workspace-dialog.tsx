"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createWorkspace, type WorkspaceSummary } from "@/lib/workspace/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspace: WorkspaceSummary) => void;
};

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emojiIcon, setEmojiIcon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setEmojiIcon("");
      setIsSubmitting(false);
    }
  }, [open]);

  const handleCreate = async () => {
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedEmoji = emojiIcon.trim();

    if (!normalizedName) {
      toast.error("Workspace name is required.");
      return;
    }

    if (normalizedDescription.length > 240) {
      toast.error("Description must be 240 characters or fewer.");
      return;
    }

    if (normalizedEmoji.length > 16) {
      toast.error("Icon must be 16 characters or fewer.");
      return;
    }

    setIsSubmitting(true);

    try {
      const workspace = await createWorkspace({
        name: normalizedName,
        description: normalizedDescription || undefined,
        emojiIcon: normalizedEmoji || undefined,
      });
      toast.success("Workspace created.");
      onCreated?.(workspace);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Set up a collaborative space for your diagrams and team activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="workspace-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Product Team"
              maxLength={80}
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="workspace-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Shared diagrams for roadmap and architecture."
              maxLength={240}
              disabled={isSubmitting}
              className="min-h-[92px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="workspace-emoji" className="text-sm font-medium">
              Icon / Emoji <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="workspace-emoji"
              value={emojiIcon}
              onChange={(event) => setEmojiIcon(event.target.value)}
              placeholder="🧩"
              maxLength={16}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
