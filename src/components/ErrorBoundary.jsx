import { Component } from 'react';
import Button from './Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="auth-loading">
          <p>Terjadi kesalahan pada tampilan aplikasi.</p>
          <Button variant="primary" onClick={this.handleReload}>
            Muat ulang
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
