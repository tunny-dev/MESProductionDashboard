import { Component } from 'react';
import { Check, Copy } from 'lucide-react';

import { ERROR_ACTION_BUTTON, ErrorScreen } from '@/components/common/ErrorScreen';
import { Button } from '@/components/ui/button';
import { i18n } from '@/core/i18n/i18n';
import { logger } from '@/core/utils/logger';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    i18n.on('languageChanged', this.handleLanguageChanged);
  }

  componentWillUnmount() {
    i18n.off('languageChanged', this.handleLanguageChanged);
  }

  componentDidCatch(error, info) {
    this.setState({ errorInfo: info });
    logger.error('app:render_crash', {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  handleLanguageChanged = () => {
    this.forceUpdate();
  };

  handleCopyError = async () => {
    const errorPayload = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      recentLogs: logger.getRecentLogs(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorPayload, null, 2));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = i18n.t.bind(i18n);

    return (
      <ErrorScreen
        role="alert"
        title={t('error.unexpected')}
        message={t('error.unexpectedDescription')}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => window.location.reload()}
              className={ERROR_ACTION_BUTTON}
            >
              {t('error.reloadPage')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={this.handleCopyError}
              className={ERROR_ACTION_BUTTON}
            >
              {this.state.copied ? (
                <>
                  <Check className="mr-2 size-4 text-emerald-600" />
                  Đã sao chép mã lỗi
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Sao chép chi tiết lỗi
                </>
              )}
            </Button>
          </div>
        }
        detail={
          this.state.error ? (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Xem chi tiết kỹ thuật
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/60 p-3 text-[11px] font-mono text-muted-foreground">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          ) : null
        }
      />
    );
  }
}
