import { useTranslation } from 'react-i18next';
import { Check, Globe, Laptop, Moon, Settings2, Sun, X } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage, LANGUAGES } from '@/core/i18n/i18n';
import { useTheme } from '@/hooks/useTheme';

export const ICON_TRIGGER =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground/70 transition-colors outline-hidden hover:bg-foreground/5 hover:text-foreground';

export const MENU_ITEM = 'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm';

export function GroupLabel({ children }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{children}</DropdownMenuLabel>
      <DropdownMenuSeparator />
    </DropdownMenuGroup>
  );
}

export function LanguageSwitcher({ className, contentStyle }) {
  const { t, i18n } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(ICON_TRIGGER, className)} aria-label={t('language.label')}>
        <Globe aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40" style={contentStyle}>
        <GroupLabel>{t('language.label')}</GroupLabel>
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={MENU_ITEM}
          >
            <span className="flex-1">{lang.label}</span>
            {i18n.language === lang.code && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSwitcherMenu({ className, contentStyle, theme, resolvedTheme, onThemeChange, t }) {
  const options = [
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'system', label: t('theme.system'), icon: Laptop },
  ];

  const ActiveIcon =
    theme === 'system'
      ? resolvedTheme === 'dark'
        ? Moon
        : Sun
      : (options.find((option) => option.value === theme)?.icon ?? Sun);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(ICON_TRIGGER, className)} aria-label={t('theme.toggle')}>
        <ActiveIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40" style={contentStyle}>
        <GroupLabel>{t('theme.label')}</GroupLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onThemeChange(option.value)}
            className={MENU_ITEM}
          >
            <option.icon aria-hidden className="size-4" />
            <span className="flex-1">{option.label}</span>
            {theme === option.value && <Check aria-hidden className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSwitcher({ className, contentStyle }) {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <ThemeSwitcherMenu
      className={className}
      contentStyle={contentStyle}
      theme={theme}
      resolvedTheme={resolvedTheme}
      onThemeChange={setTheme}
      t={t}
    />
  );
}

function PreferenceChoiceGroup({ name, value, options, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const isSelected = value === optionValue;

        return (
          <label key={optionValue} className="min-w-0 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={isSelected}
              onChange={() => onChange(optionValue)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-xs leading-tight transition-colors',
                'border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-production-blue',
                isSelected && 'border-production-blue bg-production-blue/10'
              )}
            >
              {Icon ? <Icon className="size-4 text-production-blue" aria-hidden="true" /> : null}
              <span className="text-pretty">{label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function DisplaySettingsDialog({ language, theme, onThemeChange, contentStyle, className }) {
  const { t, i18n } = useTranslation();
  const activeLanguage = String(language || i18n.resolvedLanguage || i18n.language || 'vi').split(
    '-'
  )[0];
  const themeOptions = [
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
    { value: 'system', label: t('theme.system'), icon: Laptop },
  ];
  const languageOptions = LANGUAGES.map((item) => ({
    value: item.code,
    label: t(`language.${item.code}`),
    icon: Globe,
  }));

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('settings.open')}
            title={t('settings.open')}
            className={cn(
              'size-7 justify-center border-border-strong bg-[var(--surface)] px-2 text-foreground hover:bg-[var(--surface-hover)] hover:text-foreground',
              className
            )}
          />
        }
      >
        <Settings2 data-icon="inline-start" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        style={contentStyle}
        className="border border-border-strong bg-[var(--surface)] text-foreground shadow-modal sm:max-w-md"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('settings.close')}
              className="absolute top-2 right-2"
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>
        <div className="grid gap-5">
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-foreground">{t('theme.label')}</legend>
            <PreferenceChoiceGroup
              name="dashboard-theme"
              value={theme}
              options={themeOptions}
              onChange={onThemeChange}
            />
          </fieldset>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-foreground">{t('language.label')}</legend>
            <PreferenceChoiceGroup
              name="dashboard-language"
              value={activeLanguage}
              options={languageOptions}
              onChange={changeLanguage}
            />
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}
