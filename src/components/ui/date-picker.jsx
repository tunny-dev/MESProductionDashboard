import * as React from 'react';
import { format } from 'date-fns';

import { cn } from '@/core/utils/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

const TRIGGER_CLASS =
  'h-9 w-full justify-start gap-2 px-3 text-sm font-normal data-[placeholder]:text-muted-foreground';

export function DatePicker({ value, onChange, placeholder = 'Chọn ngày', className, id }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(TRIGGER_CLASS, !value && 'text-muted-foreground', className)}
          />
        }
      >
        <CalendarIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {value ? format(value, 'dd/MM/yyyy') : <span>{placeholder}</span>}
      </PopoverTrigger>{' '}
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({ value, onChange, className, id }) {
  const [open, setOpen] = React.useState(false);
  const range = value ?? {};

  const label = range.from
    ? range.to
      ? `${format(range.from, 'dd/MM/yyyy')} – ${format(range.to, 'dd/MM/yyyy')}`
      : format(range.from, 'dd/MM/yyyy')
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(TRIGGER_CLASS, !label && 'text-muted-foreground', className)}
          />
        }
      >
        <CalendarIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {label ? <span className="truncate">{label}</span> : <span>{'Chọn khoảng ngày'}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(next) => {
            onChange?.(next);
            if (next?.from && next?.to) setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
