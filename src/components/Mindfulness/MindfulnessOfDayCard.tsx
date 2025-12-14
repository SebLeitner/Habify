import * as Dialog from '@radix-ui/react-dialog';
import { useMemo } from 'react';
import type { MindfulnessActivity } from '../../types';
import Button from '../UI/Button';

type MindfulnessOfDayCardProps = {
  entry: MindfulnessActivity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLog: () => Promise<void>;
  isLogging: boolean;
  error?: string | null;
};

const MindfulnessOfDayCard = ({
  entry,
  open,
  onOpenChange,
  onLog,
  isLogging,
  error,
}: MindfulnessOfDayCardProps) => {
  const truncatedDescription = useMemo(() => {
    if (entry.description.length <= 160) {
      return entry.description;
    }

    return `${entry.description.slice(0, 157)}...`;
  }, [entry.description]);

  return (
    <section className="rounded-xl border border-purple-900/60 bg-purple-950/40 p-4 shadow-lg shadow-purple-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-purple-200/80">Achtsamkeit des Tages</p>
          <h2 className="text-xl font-semibold text-white">{entry.title}</h2>
          <p className="text-sm text-purple-100/80">{truncatedDescription}</p>
        </div>
        <span className="text-2xl" aria-hidden>
          🧘
        </span>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4">
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
          <Dialog.Trigger asChild>
            <Button variant="secondary">Mehr anzeigen</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-5 rounded-xl border border-purple-900/60 bg-slate-950 p-6 shadow-2xl focus:outline-none">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Dialog.Title className="text-xl font-semibold text-white">{entry.title}</Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-300">
                    Ein kleiner Impuls für heute
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-700 hover:text-white">
                    ✕
                  </button>
                </Dialog.Close>
              </div>

              <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-line">{entry.description}</p>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost">Schließen</Button>
                </Dialog.Close>
                <Button onClick={onLog} disabled={isLogging}>
                  {isLogging ? 'Wird gespeichert…' : 'Als erledigt loggen'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </section>
  );
};

export default MindfulnessOfDayCard;

