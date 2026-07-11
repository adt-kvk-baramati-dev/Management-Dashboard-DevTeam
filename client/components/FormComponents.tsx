/**
 * Enhanced Form Components for AI ADT Foundation
 * Provides modern, accessible form components with improved UX
 */

import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// ============================================================================
// FORM FIELD WRAPPER - Consistent styling for all form groups
// ============================================================================
export const FormFieldGroup = ({ children, className = '' }: any) => (
  <div className={`space-y-2 ${className}`}>
    {children}
  </div>
);

// ============================================================================
// FORM LABEL - Improved styling with accessibility
// ============================================================================
export const FormLabel = ({
  children,
  required = false,
  htmlFor = '',
  className = ''
}: any) => (
  <label
    htmlFor={htmlFor}
    className={`text-sm font-semibold text-foreground flex items-center gap-2 ${className}`}
  >
    {children}
    {required && <span className="text-destructive font-bold">*</span>}
  </label>
);

// ============================================================================
// FORM INPUT - Enhanced styling with focus states
// ============================================================================
export const FormInput = React.forwardRef<HTMLInputElement, any>(
  ({ 
    label, 
    required = false,
    error = null,
    helperText = null,
    startIcon: StartIcon = null,
    endIcon: EndIcon = null,
    className = '',
    ...props 
  }, ref) => (
    <FormFieldGroup className={className}>
      {label && <FormLabel required={required} htmlFor={props.id}>{label}</FormLabel>}
      <div className="relative">
        {StartIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            <StartIcon className="w-5 h-5" />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm ${
            StartIcon ? 'pl-10' : ''
          } ${
            EndIcon ? 'pr-10' : ''
          } ${
            error
              ? 'border-destructive/60 bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
              : 'border-border/50 bg-secondary/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 hover:border-border'
          } read-only:bg-secondary/30 read-only:cursor-not-allowed read-only:text-muted-foreground`}
          {...props}
        />
        {EndIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            <EndIcon className="w-5 h-5" />
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-medium mt-1">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-on-surface-variant/70 mt-1">{helperText}</p>
      )}
    </FormFieldGroup>
  )
);

FormInput.displayName = 'FormInput';

// ============================================================================
// FORM TEXTAREA - Enhanced styling
// ============================================================================
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, any>(
  ({ 
    label, 
    required = false,
    error = null,
    helperText = null,
    className = '',
    rows = 4,
    ...props 
  }, ref) => (
    <FormFieldGroup className={className}>
      {label && <FormLabel required={required} htmlFor={props.id}>{label}</FormLabel>}
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm resize-none ${
          error
            ? 'border-destructive/60 bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
            : 'border-border/50 bg-secondary/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 hover:border-border'
        }`}
        {...props}
      />
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-medium mt-1">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-on-surface-variant/70 mt-1">{helperText}</p>
      )}
    </FormFieldGroup>
  )
);

FormTextarea.displayName = 'FormTextarea';

// ============================================================================
// FORM SELECT - Enhanced styling
// ============================================================================
export const FormSelect = React.forwardRef<HTMLSelectElement, any>(
  ({ 
    label, 
    required = false,
    error = null,
    helperText = null,
    options = [],
    className = '',
    ...props 
  }, ref) => (
    <FormFieldGroup className={className}>
      {label && <FormLabel required={required} htmlFor={props.id}>{label}</FormLabel>}
      <div className="relative">
        <select
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-lg border-2 transition-all duration-200 text-sm appearance-none cursor-pointer ${
            error
              ? 'border-destructive/60 bg-destructive/5 text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30'
              : 'border-border/50 bg-secondary/50 text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 hover:border-border'
          }`}
          {...props}
        >
          {options.map((opt: any, idx: number) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-medium mt-1">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-on-surface-variant/70 mt-1">{helperText}</p>
      )}
    </FormFieldGroup>
  )
);

FormSelect.displayName = 'FormSelect';

// ============================================================================
// STATUS MESSAGE - Better styled status feedback
// ============================================================================
export const FormStatus = ({ 
  kind = 'idle', 
  message = '',
  onDismiss = null 
}: any) => {
  if (kind === 'idle') return null;

  const styles = {
    loading: 'bg-secondary/50 border-border/30 text-foreground',
    success: 'bg-primary/10 border-primary/30 text-primary',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    info: 'bg-secondary/50 border-border/30 text-foreground',
  };

  const icons = {
    loading: <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    error: <AlertTriangle className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${styles[kind]}`}>
      {icons[kind]}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// FORM SECTION - Grouped form fields with visual separation
// ============================================================================
export const FormSection = ({
  title,
  subtitle = null,
  icon: Icon = null,
  iconColor = 'text-primary bg-primary/10',
  children,
  className = ''
}: any) => (
  <div className={`space-y-4 pb-4 ${className}`}>
    {(title || subtitle || Icon) && (
      <div className="flex items-center gap-3 pb-4 border-b border-border/30">
        {Icon && (
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          {title && <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// ============================================================================
// FILE INPUT - Enhanced styling with preview
// ============================================================================
export const FormFileInput = ({
  label,
  required = false,
  error = null,
  helperText = null,
  accept = 'image/*',
  preview = null,
  onFileChange = null,
  className = '',
  ...props
}: any) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <FormFieldGroup className={className}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          error
            ? 'border-destructive/40 bg-destructive/5 hover:border-destructive/60'
            : 'border-outline-variant/40 bg-surface-container-low hover:border-primary/60 hover:bg-primary/5'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onFileChange?.(e.target.files?.[0])}
          {...props}
        />
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-on-surface">Click to upload or drag and drop</p>
            <p className="text-xs text-on-surface-variant">PNG, JPG, GIF up to 10MB</p>
          </div>
        </div>
      </div>
      {preview && (
        <div className="mt-3">
          <img src={preview} alt="preview" className="w-16 h-16 rounded-xl object-cover border border-outline-variant/30" />
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-medium mt-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {helperText && !error && (
        <p className="text-xs text-on-surface-variant/70 mt-2">{helperText}</p>
      )}
    </FormFieldGroup>
  );
};
