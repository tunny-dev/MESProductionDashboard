import { useTranslation } from 'react-i18next';
import { ShieldX } from 'lucide-react';

import { ErrorPrimaryButton, ErrorScreen } from './error-screen';

export function Forbidden() {
  const { t } = useTranslation();

  // Nút về trang chủ (KHÔNG về /overview): user bị chặn mà bấm về Tổng quan
  // sẽ lặp 403. Các màn lỗi khác vẫn về /overview bình thường.
  return (
    <ErrorScreen
      icon={ShieldX}
      code="403"
      title={t('error.forbiddenTitle')}
      message={t('error.forbiddenDescription')}
      actions={<ErrorPrimaryButton to="/">{t('nav.home')}</ErrorPrimaryButton>}
    />
  );
}
