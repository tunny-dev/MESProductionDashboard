import { Component } from 'react';

import { ERROR_ACTION_BUTTON, ErrorScreen } from '@/components/common/ErrorScreen';
import { Button } from '@/components/ui/button';
import { i18n } from '@/core/i18n/i18n';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidMount() {
    i18n.on('languageChanged', this.handleLanguageChanged);
  }

  componentWillUnmount() {
    i18n.off('languageChanged', this.handleLanguageChanged);
  }

  componentDidCatch(error, info) {
    console.error('Lỗi render không bắt được:', error, info);
  }

  handleLanguageChanged = () => {
    this.forceUpdate();
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
          <Button
            size="lg"
            onClick={() => window.location.reload()}
            className={ERROR_ACTION_BUTTON}
          >
            {t('error.reloadPage')}
          </Button>
        }
      />
    );
  }
}
