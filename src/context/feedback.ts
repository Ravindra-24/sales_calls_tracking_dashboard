import { createContext, useContext } from 'react';

export type FeedbackVariant = 'default' | 'warning' | 'danger' | 'destructive';
export type ToastVariant = 'info' | 'success' | 'error';

export interface ConfirmOptions {
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: FeedbackVariant;
}

export interface RequestTextOptions extends ConfirmOptions {
  label: string;
  placeholder?: string;
  initialValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  validate?: (value: string) => string | undefined;
}

export interface FeedbackFieldOptions {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  initialValue?: string;
  helpText?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  multiline?: boolean;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  validate?: (value: string, values: Record<string, string>) => string | undefined;
}

export interface RequestFieldsOptions extends ConfirmOptions {
  fields: FeedbackFieldOptions[];
  validate?: (values: Record<string, string>) => string | undefined;
}

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface FeedbackContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  requestText: (options: RequestTextOptions) => Promise<string | null>;
  toast: (options: ToastOptions) => void;
  requestFields: (options: RequestFieldsOptions) => Promise<Record<string, string> | null>;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const useFeedback = (): FeedbackContextValue => {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback must be used within a FeedbackProvider.');
  return value;
};
