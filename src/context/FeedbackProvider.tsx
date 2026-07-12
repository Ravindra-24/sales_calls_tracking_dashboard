import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  FeedbackContext,
  type ConfirmOptions,
  type FeedbackContextValue,
  type RequestFieldsOptions,
  type RequestTextOptions,
  type ToastOptions,
} from './feedback';
import '../styles/feedback.css';

type DialogResult = boolean | string | Record<string, string> | null;

type DialogRequest = {
  id: number;
  trigger: HTMLElement | null;
  resolve: (value: DialogResult) => void;
} & (
  | { kind: 'confirm'; options: ConfirmOptions }
  | { kind: 'text'; options: RequestTextOptions }
  | { kind: 'fields'; options: RequestFieldsOptions }
);

interface ToastRecord extends Required<Pick<ToastOptions, 'message' | 'variant' | 'duration'>> {
  id: number;
  title?: string;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isDanger = (variant: ConfirmOptions['variant']) => (
  variant === 'danger' || variant === 'destructive'
);

const DialogIcon = ({ variant }: { variant: ConfirmOptions['variant'] }) => {
  if (isDanger(variant)) return <XCircle aria-hidden="true" />;
  if (variant === 'warning') return <AlertTriangle aria-hidden="true" />;
  return <Info aria-hidden="true" />;
};

const validateRequired = (value: string, required: boolean | undefined, minLength?: number) => {
  const trimmed = value.trim();
  if ((required ?? true) && !trimmed) return 'This field is required.';
  if (minLength !== undefined && trimmed.length < minLength) {
    return `Enter at least ${minLength} characters.`;
  }
  return undefined;
};

const FeedbackDialog = ({
  request,
  onResolve,
}: {
  request: DialogRequest;
  onResolve: (value: DialogResult) => void;
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const options = request.options;
  const [textValue, setTextValue] = useState(
    request.kind === 'text' ? request.options.initialValue ?? '' : '',
  );
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => (
    request.kind === 'fields'
      ? Object.fromEntries(request.options.fields.map((field) => [field.id, field.initialValue ?? '']))
      : {}
  ));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const titleId = `feedback-dialog-title-${request.id}`;
  const descriptionId = `feedback-dialog-description-${request.id}`;
  const description = options.message ?? options.description;
  const variant = options.variant ?? 'default';
  const cancel = useCallback(() => {
    onResolve(request.kind === 'confirm' ? false : null);
  }, [onResolve, request.kind]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const firstField = dialog.querySelector<HTMLElement>('input, textarea');
      const primaryAction = dialog.querySelector<HTMLElement>('[data-feedback-primary]');
      (firstField ?? primaryAction ?? dialog).focus();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (request.trigger?.isConnected) request.trigger.focus();
    };
  }, [request.id, request.trigger]);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      cancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [cancel]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getAttribute('aria-hidden') !== 'true');
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setFormError('');

    if (request.kind === 'confirm') {
      onResolve(true);
      return;
    }

    if (request.kind === 'text') {
      const error = validateRequired(textValue, request.options.required, request.options.minLength)
        ?? (request.options.maxLength !== undefined && textValue.length > request.options.maxLength
          ? `Enter no more than ${request.options.maxLength} characters.`
          : undefined)
        ?? request.options.validate?.(textValue);
      if (error) {
        setErrors({ value: error });
        return;
      }
      onResolve(textValue);
      return;
    }

    const nextErrors: Record<string, string> = {};
    request.options.fields.forEach((field) => {
      const value = fieldValues[field.id] ?? '';
      const error = validateRequired(value, field.required, field.minLength)
        ?? (field.maxLength !== undefined && value.length > field.maxLength
          ? `Enter no more than ${field.maxLength} characters.`
          : undefined)
        ?? field.validate?.(value, fieldValues);
      if (error) nextErrors[field.id] = error;
    });
    const nextFormError = request.options.validate?.(fieldValues) ?? '';
    if (Object.keys(nextErrors).length > 0 || nextFormError) {
      setErrors(nextErrors);
      setFormError(nextFormError);
      return;
    }
    onResolve(fieldValues);
  };

  const renderTextField = (fieldOptions: RequestTextOptions) => {
    const commonProps = {
      id: `feedback-field-${request.id}`,
      className: `feedback-dialog__field${errors.value ? ' has-error' : ''}`,
      value: textValue,
      placeholder: fieldOptions.placeholder,
      maxLength: fieldOptions.maxLength,
      inputMode: fieldOptions.inputMode,
      'aria-label': fieldOptions.label,
      'aria-invalid': Boolean(errors.value),
      'aria-describedby': errors.value ? `feedback-field-error-${request.id}` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextValue(event.target.value);
        if (errors.value) setErrors({});
      },
    };
    return (
      <label className="feedback-dialog__label" htmlFor={commonProps.id}>
        <span>{fieldOptions.label}</span>
        {fieldOptions.multiline
          ? <textarea {...commonProps} rows={4} />
          : <input {...commonProps} type="text" />}
        {errors.value && <small className="feedback-dialog__error" id={`feedback-field-error-${request.id}`}>{errors.value}</small>}
      </label>
    );
  };

  return (
    <div
      className="feedback-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}
    >
      <div
        ref={dialogRef}
        className={`feedback-dialog feedback-dialog--${isDanger(variant) ? 'danger' : variant}`}
        role={variant === 'default' ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <button className="feedback-dialog__close" type="button" aria-label="Close dialog" onClick={cancel}>
          <X aria-hidden="true" size={19} />
        </button>
        <div className="feedback-dialog__heading">
          <span className="feedback-dialog__icon"><DialogIcon variant={variant} /></span>
          <div>
            <h2 id={titleId}>{options.title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
        </div>
        <form onSubmit={submit} noValidate>
          {request.kind === 'text' && renderTextField(request.options)}
          {request.kind === 'fields' && (
            <div className="feedback-dialog__fields">
              {request.options.fields.map((field) => {
                const fieldId = `feedback-field-${request.id}-${field.id}`;
                const errorId = `${fieldId}-error`;
                const helpId = `${fieldId}-help`;
                const sharedProps = {
                  id: fieldId,
                  className: `feedback-dialog__field${errors[field.id] ? ' has-error' : ''}`,
                  value: fieldValues[field.id] ?? '',
                  placeholder: field.placeholder,
                  maxLength: field.maxLength,
                  inputMode: field.inputMode,
                  'aria-label': field.label,
                  'aria-invalid': Boolean(errors[field.id]),
                  'aria-describedby': errors[field.id] ? errorId : field.helpText ? helpId : undefined,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    setFieldValues((current) => ({ ...current, [field.id]: event.target.value }));
                    if (errors[field.id]) setErrors((current) => ({ ...current, [field.id]: '' }));
                  },
                };
                return (
                  <label className="feedback-dialog__label" htmlFor={fieldId} key={field.id}>
                    <span>{field.label}</span>
                    {field.multiline
                      ? <textarea {...sharedProps} rows={4} />
                      : <input {...sharedProps} type={field.type ?? 'text'} />}
                    {field.helpText && !errors[field.id] && <small className="feedback-dialog__help" id={helpId}>{field.helpText}</small>}
                    {errors[field.id] && <small className="feedback-dialog__error" id={errorId}>{errors[field.id]}</small>}
                  </label>
                );
              })}
            </div>
          )}
          {formError && <div className="feedback-dialog__form-error" role="alert">{formError}</div>}
          <div className="feedback-dialog__actions">
            <button className="feedback-dialog__button feedback-dialog__button--secondary" type="button" onClick={cancel}>
              {options.cancelLabel ?? 'Cancel'}
            </button>
            <button
              className={`feedback-dialog__button feedback-dialog__button--primary${isDanger(variant) ? ' is-danger' : ''}`}
              type="submit"
              data-feedback-primary
            >
              {options.confirmLabel ?? (request.kind === 'confirm' ? 'Confirm' : 'Continue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ToastItem = ({ item, onDismiss }: { item: ToastRecord; onDismiss: (id: number) => void }) => {
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const timeout = useRef<number | null>(null);

  const pause = useCallback(() => {
    if (timeout.current === null) return;
    window.clearTimeout(timeout.current);
    timeout.current = null;
    remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
  }, []);

  const resume = useCallback(() => {
    if (timeout.current !== null || remaining.current <= 0) return;
    startedAt.current = performance.now();
    timeout.current = window.setTimeout(() => onDismiss(item.id), remaining.current);
  }, [item.id, onDismiss]);

  useEffect(() => {
    remaining.current = item.duration;
    resume();
    return () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, [item.duration, resume]);

  const Icon = item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? XCircle : Info;
  return (
    <article
      className={`feedback-toast feedback-toast--${item.variant}`}
      role={item.variant === 'error' ? 'alert' : 'status'}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) resume();
      }}
    >
      <Icon className="feedback-toast__icon" aria-hidden="true" size={20} />
      <div className="feedback-toast__copy">
        {item.title && <strong>{item.title}</strong>}
        <p>{item.message}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)}>
        <X aria-hidden="true" size={17} />
      </button>
      <span className="feedback-toast__timer" style={{ animationDuration: `${item.duration}ms` }} />
    </article>
  );
};

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const requestId = useRef(0);
  const toastId = useRef(0);
  const resolvingRequestId = useRef<number | null>(null);
  const [requests, setRequests] = useState<DialogRequest[]>([]);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const activeRequest = requests[0];
  const hasActiveRequest = Boolean(activeRequest);

  useEffect(() => {
    if (!hasActiveRequest) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const clientWidth = document.documentElement.clientWidth;
    const scrollbarWidth = clientWidth > 0 ? window.innerWidth - clientWidth : 0;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [hasActiveRequest]);

  const enqueue = useCallback((request: Omit<DialogRequest, 'id' | 'trigger'>) => {
    const nextRequest = {
      ...request,
      id: ++requestId.current,
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    } as DialogRequest;
    setRequests((current) => [...current, nextRequest]);
  }, []);

  const confirm = useCallback<FeedbackContextValue['confirm']>((options) => (
    new Promise<boolean>((resolve) => enqueue({
      kind: 'confirm',
      options,
      resolve: (value) => resolve(value === true),
    }))
  ), [enqueue]);

  const requestText = useCallback<FeedbackContextValue['requestText']>((options) => (
    new Promise<string | null>((resolve) => enqueue({
      kind: 'text',
      options,
      resolve: (value) => resolve(typeof value === 'string' ? value : null),
    }))
  ), [enqueue]);

  const requestFields = useCallback<FeedbackContextValue['requestFields']>((options) => (
    new Promise<Record<string, string> | null>((resolve) => enqueue({
      kind: 'fields',
      options,
      resolve: (value) => resolve(value && typeof value === 'object' ? value : null),
    }))
  ), [enqueue]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<FeedbackContextValue['toast']>((options) => {
    const variant = options.variant ?? 'info';
    const nextToast: ToastRecord = {
      id: ++toastId.current,
      title: options.title,
      message: options.message,
      variant,
      duration: options.duration ?? (variant === 'error' ? 7000 : 4000),
    };
    setToasts((current) => [...current, nextToast].slice(-3));
  }, []);

  const resolveActiveRequest = useCallback((value: DialogResult) => {
    if (!activeRequest || resolvingRequestId.current === activeRequest.id) return;
    resolvingRequestId.current = activeRequest.id;
    activeRequest.resolve(value);
    setRequests((current) => current.filter((request) => request.id !== activeRequest.id));
  }, [activeRequest]);

  const value = useMemo<FeedbackContextValue>(() => ({
    confirm,
    requestText,
    requestFields,
    toast,
  }), [confirm, requestFields, requestText, toast]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && activeRequest && createPortal(
        <FeedbackDialog key={activeRequest.id} request={activeRequest} onResolve={resolveActiveRequest} />,
        document.body,
      )}
      {typeof document !== 'undefined' && toasts.length > 0 && createPortal(
        <div className="feedback-toasts" aria-label="Notifications">
          {toasts.map((item) => <ToastItem item={item} onDismiss={dismissToast} key={item.id} />)}
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
};
