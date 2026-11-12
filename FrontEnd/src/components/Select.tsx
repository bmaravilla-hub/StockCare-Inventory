import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder,
  error,
  helperText,
  id,
  required,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
          {required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500 ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-300 focus:border-teal-600 focus:ring-teal-100'
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        helperText && <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
};

