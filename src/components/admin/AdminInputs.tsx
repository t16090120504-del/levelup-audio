import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';

/**
 * Shared form field primitives for the admin console.
 *
 * These match the dark JRPG theme used elsewhere in the app (gold focus glow,
 * elevated background, muted labels) and keep the admin CRUD forms consistent.
 */

interface FieldWrapperProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FieldWrapper({
  label,
  htmlFor,
  hint,
  error,
  children,
}: FieldWrapperProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-status-warning">{error}</p>
      )}
    </div>
  );
}

const inputBaseClasses =
  'w-full bg-bg-elevated border border-bg-hover rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:border-gold/50 focus:shadow-gold-glow-sm';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, id, className = '', ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        className={[inputBaseClasses, error ? 'border-status-warning/50' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    </FieldWrapper>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextArea({ label, hint, error, id, className = '', ...props }: TextAreaProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} hint={hint} error={error}>
      <textarea
        id={id}
        className={[inputBaseClasses, 'resize-y min-h-[80px]', error ? 'border-status-warning/50' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    </FieldWrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function SelectField({
  label,
  hint,
  error,
  id,
  options,
  placeholder,
  className = '',
  ...props
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} hint={hint} error={error}>
      <select
        id={id}
        className={[inputBaseClasses, 'cursor-pointer', error ? 'border-status-warning/50' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-elevated">
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

type NumberFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function NumberField({ label, hint, error, id, className = '', ...props }: NumberFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} hint={hint} error={error}>
      <input
        id={id}
        type="number"
        className={[inputBaseClasses, error ? 'border-status-warning/50' : '', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    </FieldWrapper>
  );
}
