import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// Reusable confirmation dialog. Supports a trigger (uncontrolled) or
// open/onOpenChange (controlled) for row-level destructive actions.
export default function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  destructive = false
}) {
  const content = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          disabled={loading}
          onClick={onConfirm}
          className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
        >
          {loading ? "Working…" : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (open !== undefined) {
    return <AlertDialog open={open} onOpenChange={onOpenChange}>{content}</AlertDialog>;
  }
  return <AlertDialog><AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>{content}</AlertDialog>;
}