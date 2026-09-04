import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Colors, Typography} from '../../styles';
import {createLogger} from '../../utils/logger';

const log = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: React.ReactNode;
  label: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error(`Caught error in "${this.props.label}"`, {
      message: error?.message,
      componentStack: info?.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>
            {this.props.fallbackMessage ??
              'Something went wrong here. Please go back and try again.'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
  },
});
