/**
 * Bắt lỗi ở gốc cây React.
 *
 * Lỗi render không hiện ra DOM sẽ để trang trắng trơn — trên TV đang treo tường
 * thì đó là màn đen không ai hiểu. Chặn ở đây và nói rõ có gì hỏng.
 *
 * Đây là class component vì React không có hook cho lỗi render. Vì vậy không dùng
 * được `useTranslation` — đọc thẳng `i18n` và tự đăng ký nghe đổi ngôn ngữ.
 */

import { Component } from 'react';

import { i18n } from '@/i18n';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidMount() {
    // Trang lỗi vẫn phải đổi theo ngôn ngữ: người dùng đổi ngôn ngữ rồi mới
    // phát hiện app vỡ, thấy chữ ở ngôn ngữ cũ thì tưởng lỗi của cả app.
    i18n.on('languageChanged', this.handleLanguageChanged);
  }

  componentWillUnmount() {
    i18n.off('languageChanged', this.handleLanguageChanged);
  }

  componentDidCatch(error, info) {
    // Gửi lên hệ thống giám sát lỗi khi có. Hiện chưa có nơi gửi nên chỉ log.
    console.error('Lỗi render không bắt được:', error, info);
  }

  handleLanguageChanged = () => {
    this.forceUpdate();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = i18n.t.bind(i18n);

    return (
      <div
        role="alert"
        className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <p className="text-sm font-medium text-error-text">{t('error.unexpected')}</p>
        <p className="max-w-[55ch] text-sm text-pretty text-muted-foreground">
          {t('error.unexpectedDescription')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground transition-colors outline-hidden hover:bg-button-hover"
        >
          {t('error.reloadPage')}
        </button>
      </div>
    );
  }
}
