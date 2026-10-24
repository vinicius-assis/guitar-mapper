import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

interface Pending {
  options: ConfirmOptions;
  resolve(answer: boolean): void;
}

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<Confirm>((options) => {
    // Uma pergunta nova cancela a anterior, para nenhuma promessa ficar sem resposta.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next: Pending = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const answer = useCallback((value: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(value);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <Dialog key={pending.options.title} options={pending.options} onAnswer={answer} />}
    </ConfirmContext.Provider>
  );
}

function Dialog({
  options,
  onAnswer,
}: {
  options: ConfirmOptions;
  onAnswer(value: boolean): void;
}) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onAnswer(false);
    } else if (event.key === 'Tab') {
      // Só há dois botões: Tab e Shift+Tab alternam entre eles, sem sair do diálogo.
      event.preventDefault();
      const onCancel = document.activeElement === cancelRef.current;
      (onCancel ? actionRef : cancelRef).current?.focus();
    }
  }

  return (
    <div
      className="confirm-backdrop"
      data-testid="confirm-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onAnswer(false);
      }}
    >
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? messageId : undefined}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId}>{options.title}</h2>
        {options.message && <p id={messageId}>{options.message}</p>}
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="summary-button" onClick={() => onAnswer(false)}>
            {options.cancelLabel ?? 'Cancelar'}
          </button>
          <button ref={actionRef} type="button" className="summary-button confirm-danger" onClick={() => onAnswer(true)}>
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm(): Confirm {
  const value = useContext(ConfirmContext);
  if (!value) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return value;
}
