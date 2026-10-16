import * as React from 'react';
import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import { cn } from '@/lib/utils';

export function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (nextOpen, event) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen, event);
  };

  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      data-state={isOpen ? 'open' : 'closed'}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(className)}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Root>
  );
}

export function CollapsibleTrigger({ className, ...props }) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

export function CollapsibleContent({ className, ...props }) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden transition-all data-[closed]:animate-collapsible-up data-[open]:animate-collapsible-down',
        className
      )}
      {...props}
    />
  );
}
