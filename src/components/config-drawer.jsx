import { CircleCheck, RotateCcw, Settings } from 'lucide-react';
import { IconDir } from '@/assets/custom/icon-dir';
import { IconLayoutCompact } from '@/assets/custom/icon-layout-compact';
import { IconLayoutDefault } from '@/assets/custom/icon-layout-default';
import { IconLayoutFull } from '@/assets/custom/icon-layout-full';
import { IconSidebarFloating } from '@/assets/custom/icon-sidebar-floating';
import { IconSidebarInset } from '@/assets/custom/icon-sidebar-inset';
import { IconSidebarSidebar } from '@/assets/custom/icon-sidebar-sidebar';
import { cn } from '@/lib/utils';
import { useDirection } from '@/providers/direction-provider';
import { useLayout } from '@/providers/layout-provider';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSidebar } from '@/components/ui/sidebar';

export function ConfigDrawer() {
  const { setOpen } = useSidebar();
  const { resetDir } = useDirection();
  const { setTheme } = useTheme();
  const { resetLayout } = useLayout();

  const handleReset = () => {
    setOpen(true);
    resetDir();
    setTheme('system');
    resetLayout();
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open layout settings"
            className="cursor-pointer"
          />
        }
      >
        <Settings aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>Layout Settings</SheetTitle>
          <SheetDescription id="config-drawer-description">
            Adjust the sidebar, layout and direction to suit your preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 overflow-y-auto px-4 py-2 flex-1">
          <SidebarConfig />
          <LayoutConfig />
          <DirConfig />
        </div>
        <SheetFooter className="gap-2 border-t pt-4">
          <Button
            variant="destructive"
            onClick={handleReset}
            aria-label="Reset all settings to default values"
            className="w-full sm:w-auto"
          >
            Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ title, showReset = false, onReset, className }) {
  return (
    <div
      className={cn(
        'text-muted-foreground mb-2 flex items-center gap-2 text-sm font-semibold',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          size="icon"
          variant="secondary"
          className="size-4 rounded-full cursor-pointer"
          onClick={onReset}
        >
          <RotateCcw className="size-3" />
        </Button>
      )}
    </div>
  );
}

function RadioOption({ item }) {
  return (
    <RadioGroupItem
      value={item.value}
      className={cn('group outline-hidden transition duration-200 ease-in')}
      aria-label={`Select ${item.label.toLowerCase()}`}
    >
      <div
        className={cn(
          'ring-border relative rounded-[6px] ring-1 p-0.5',
          'group-data-[state=checked]:ring-primary group-data-[state=checked]:shadow-md',
          'group-focus-visible:ring-2'
        )}
      >
        <CircleCheck
          className={cn(
            'fill-primary size-5 stroke-white',
            'group-data-[state=unchecked]:hidden',
            'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 z-10'
          )}
          aria-hidden="true"
        />
        <item.icon
          className={cn(
            'stroke-primary fill-primary group-data-[state=unchecked]:stroke-muted-foreground group-data-[state=unchecked]:fill-muted-foreground'
          )}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1 text-center text-xs text-muted-foreground group-data-[state=checked]:text-foreground font-medium">
        {item.label}
      </div>
    </RadioGroupItem>
  );
}

function SidebarConfig() {
  const { defaultVariant, variant, setVariant } = useLayout();
  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Sidebar"
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
      />
      <RadioGroup
        value={variant}
        onValueChange={setVariant}
        className="grid w-full grid-cols-3 gap-3"
      >
        {[
          { value: 'inset', label: 'Inset', icon: IconSidebarInset },
          { value: 'floating', label: 'Floating', icon: IconSidebarFloating },
          { value: 'sidebar', label: 'Sidebar', icon: IconSidebarSidebar },
        ].map((item) => (
          <RadioOption key={item.value} item={item} />
        ))}
      </RadioGroup>
    </div>
  );
}

function LayoutConfig() {
  const { open, setOpen } = useSidebar();
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout();

  const radioState = open ? 'default' : collapsible;

  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Layout"
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true);
          setCollapsible(defaultCollapsible);
        }}
      />
      <RadioGroup
        value={radioState}
        onValueChange={(v) => {
          if (v === 'default') {
            setOpen(true);
            return;
          }
          setOpen(false);
          setCollapsible(v);
        }}
        className="grid w-full grid-cols-3 gap-3"
      >
        {[
          { value: 'default', label: 'Default', icon: IconLayoutDefault },
          { value: 'icon', label: 'Compact', icon: IconLayoutCompact },
          { value: 'offcanvas', label: 'Full layout', icon: IconLayoutFull },
        ].map((item) => (
          <RadioOption key={item.value} item={item} />
        ))}
      </RadioGroup>
    </div>
  );
}

function DirConfig() {
  const { defaultDir, dir, setDir } = useDirection();
  return (
    <div>
      <SectionTitle
        title="Direction"
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
      />
      <RadioGroup value={dir} onValueChange={setDir} className="grid w-full grid-cols-3 gap-3">
        {[
          {
            value: 'ltr',
            label: 'Left to Right',
            icon: (props) => <IconDir dir="ltr" {...props} />,
          },
          {
            value: 'rtl',
            label: 'Right to Left',
            icon: (props) => <IconDir dir="rtl" {...props} />,
          },
        ].map((item) => (
          <RadioOption key={item.value} item={item} />
        ))}
      </RadioGroup>
    </div>
  );
}
