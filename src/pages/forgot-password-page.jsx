import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
        >
          SF
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{t('auth.forgotTitle')}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {t('auth.forgotDescription')}
        </p>

        <Link
          to="/login"
          className="mt-6 inline-flex h-10 items-center gap-2 text-sm font-medium text-foreground underline-offset-4 outline-hidden hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t('auth.backToSignIn')}
        </Link>
      </div>
    </div>
  );
}
