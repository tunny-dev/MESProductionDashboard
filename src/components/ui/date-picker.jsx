/**
 * Ô CHỌN NGÀY (một ngày) và Ô CHỌN KHOẢNG NGÀY.
 *
 * Cùng bộ khung với shadcn: Popover (Base UI trong dự án) + Calendar
 * (react-day-picker). Icon lấy từ lucide như các component khác — không
 * `@radix-ui/react-icons` vì dự án không cài package đó.
 *
 * Ngày được trả về là object `Date` của react-day-picker (00:00 local time).
 * Ai cần giá trị để đưa lên URL thì tự format — component không ép kiểu.
 */

import * as React from 'react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

const TRIGGER_CLASS =
  'h-9 w-full justify-start gap-2 px-3 text-sm font-normal data-[placeholder]:text-muted-foreground';

/**
 * Chọn MỘT ngày.
 *
 * @param value      ngày đang chọn (Date | undefined)
 * @param onChange   nhận Date | undefined
 * @param placeholder chữ khi chưa chọn
 */
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

/**
 * Chọn KHOẢNG ngày (from → to).
 *
 * @param value      { from?: Date, to?: Date }
 * @param onChange   nhận { from, to }
 */
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
            // Chọn xong cả hai đầu thì đóng, giống ô một ngày.
            if (next?.from && next?.to) setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
