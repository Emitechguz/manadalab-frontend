"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
};

export function Modal({ open, title, onClose, children, busy = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={event => { if (busy) event.preventDefault(); }}
    >
      <div className="dialog-top">
        <h2 id={titleId}>{title}</h2>
        <Button onClick={onClose} disabled={busy} aria-label="Cerrar ventana">Cerrar</Button>
      </div>
      {children}
    </dialog>
  );
}
