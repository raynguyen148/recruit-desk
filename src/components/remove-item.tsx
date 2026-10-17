import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";
import { useAutosave } from "./autosave";

export function RemoveItem({
  label,
  title,
  onRemove,
}: {
  label: string;
  title: string;
  onRemove: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { flush } = useAutosave();
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        onClick={async () => {
          if (await flush()) setOpen(true);
          else
            toast.error("Resolve unsaved changes before removing this item.");
        }}
      >
        <Trash2 size={14} />
      </Button>
      <Confirm
        open={open}
        onOpenChange={(value) => !busy && setOpen(value)}
        title={`Delete ${title}?`}
        description="This permanently removes this item from the profile. The rest of the profile is kept."
        busy={busy}
        onConfirm={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await onRemove();
            setOpen(false);
            toast.success("Item removed");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not remove this item.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
