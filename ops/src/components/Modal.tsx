import React, { useEffect, useId, useRef } from 'react';
import { Button } from './Workspace';
interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }
/** Native modal dialog provides focus containment, Escape handling and focus restoration. */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <dialog ref={dialogRef} className="ui-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="ui-dialog-header"><h2 id={titleId}>{title}</h2><Button variant="secondary" onClick={onClose} aria-label="Close dialog">Close</Button></div>
    <div className="ui-dialog-body">{children}</div>
  </dialog>;
};
