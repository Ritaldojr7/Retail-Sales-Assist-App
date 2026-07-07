import React from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className = "" }: FormSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h4 className="fs-section font-semibold text-text-primary">{title}</h4>
        {description && <p className="fs-small text-text-secondary mt-1">{description}</p>}
      </div>
      <div className="grid grid-cols-1 gap-4">{children}</div>
    </div>
  );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  containerClassName?: string;
}

export function InputField({
  label,
  required = false,
  error,
  containerClassName = "",
  id,
  className = "",
  ...props
}: InputFieldProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      <label htmlFor={inputId} className="fs-small font-semibold text-text-primary">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={inputId}
        required={required}
        className={`h-11 px-4 rounded-sm border bg-bg-secondary text-text-primary fs-body focus-ring transition-120 placeholder-text-tertiary
          ${error ? "border-red-500" : "border-border hover:border-border-hover"}
          ${className}`}
        {...props}
      />
      {error && <p className="fs-small text-red-500 font-medium">{error}</p>}
    </div>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string;
  options: { label: string; value: string | number }[];
  placeholder?: string;
  containerClassName?: string;
}

export function SelectField({
  label,
  required = false,
  error,
  options,
  placeholder,
  containerClassName = "",
  id,
  className = "",
  ...props
}: SelectFieldProps) {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      <label htmlFor={selectId} className="fs-small font-semibold text-text-primary">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={selectId}
        required={required}
        className={`h-11 px-4 rounded-sm border bg-bg-secondary text-text-primary fs-body focus-ring transition-120 cursor-pointer
          ${error ? "border-red-500" : "border-border hover:border-border-hover"}
          ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="fs-small text-red-500 font-medium">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  containerClassName?: string;
}

export function TextArea({
  label,
  required = false,
  error,
  containerClassName = "",
  id,
  className = "",
  ...props
}: TextAreaProps) {
  const areaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={`flex flex-col gap-2 ${containerClassName}`}>
      <label htmlFor={areaId} className="fs-small font-semibold text-text-primary">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={areaId}
        required={required}
        rows={4}
        className={`p-4 rounded-sm border bg-bg-secondary text-text-primary fs-body focus-ring transition-120 placeholder-text-tertiary resize-y
          ${error ? "border-red-500" : "border-border hover:border-border-hover"}
          ${className}`}
        {...props}
      />
      {error && <p className="fs-small text-red-500 font-medium">{error}</p>}
    </div>
  );
}
