'use client';

import { cn } from '@/components/ui/utils';
import * as React from 'react';
import { Drawer as Vaul } from 'vaul';

/** Bottom sheet backed by vaul. Use for the daily check-in and similar tray-style surfaces. */
const Sheet = Vaul.Root;
const SheetTrigger = Vaul.Trigger;
const SheetClose = Vaul.Close;
const SheetPortal = Vaul.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Vaul.Overlay>,
  React.ComponentPropsWithoutRef<typeof Vaul.Overlay>
>(({ className, ...props }, ref) => (
  <Vaul.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-text/30 backdrop-blur-sm', className)}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Vaul.Content>,
  React.ComponentPropsWithoutRef<typeof Vaul.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Vaul.Content
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col',
        'rounded-t-2xl border-t border-border bg-surface-overlay shadow-3',
        'focus:outline-none',
        className,
      )}
      {...props}
    >
      {/* Drag handle */}
      <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-border" />
      {children}
    </Vaul.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 px-6 pt-4 pb-2', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 px-6 pb-8 pt-2', className)} {...props} />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-lg font-semibold text-text', className)} {...props} />
  ),
);
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
));
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
