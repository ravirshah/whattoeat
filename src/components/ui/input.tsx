import { cn } from '@/components/ui/utils';
import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2',
          'text-sm text-text placeholder:text-text-placeholder',
          'transition-colors duration-snap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
