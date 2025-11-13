import * as Dialog from '@radix-ui/react-dialog';
import { ReactNode, useState } from 'react';
import Button from './Button';

type ModalProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
};

const Modal = ({ triggerLabel, title, description, children }: ModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary">{triggerLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-white">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                ✕
              </button>
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="mb-4 text-sm text-slate-400">{description}</Dialog.Description>}
          <div className="space-y-4">{children(() => setOpen(false))}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Modal;
