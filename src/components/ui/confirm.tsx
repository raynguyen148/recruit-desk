import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "./button";
import { useReturnFocus } from "./dialog";
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const returnFocus = useReturnFocus();
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content" {...returnFocus}>
          <AlertDialog.Title className="dialog-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            {description}
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button variant="destructive" onClick={onConfirm} disabled={busy}>
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
