import * as React from 'react';
import { Radio as RadioPrimitive, RadioGroup as BaseRadioGroup } from '@base-ui/react';
import { cn } from '@/lib/utils';

const RadioGroupContext = React.createContext({ value: undefined });

export function RadioGroup({ value, defaultValue, onValueChange, className, children, ...props }) {
  return (
    <RadioGroupContext.Provider value={{ value: value ?? defaultValue }}>
      <BaseRadioGroup
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        className={cn('grid gap-2', className)}
        {...props}
      >
        {children}
      </BaseRadioGroup>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({ value, className, children, ...props }) {
  const context = React.useContext(RadioGroupContext);
  const isChecked = context.value === value;

  return (
    <RadioPrimitive.Root
      value={value}
      data-slot="radio-group-item"
      data-state={isChecked ? 'checked' : 'unchecked'}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </RadioPrimitive.Root>
  );
}

// Aliases for compatibility with config-drawer pattern
export const Root = RadioGroup;
export const Item = RadioGroupItem;
