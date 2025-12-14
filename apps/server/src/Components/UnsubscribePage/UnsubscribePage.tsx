import React from 'react';
import Image from 'next/image';
import classes from './UnsubscribePage.module.css';
import letterImage from '../../../public/verify/letterImage.png';

interface ValidationData {
  isValid: boolean;
  isExpired: boolean;
  hasAlertMethod: boolean;
  hasUser: boolean;
  alertMethodDestination?: string;
  userName?: string | null;
  error?: string;
}

interface ResultData {
  success: boolean;
  message: string;
}

interface Props {
  token: string;
  validation?: ValidationData;
  isValidating: boolean;
  validationError: Error | null | unknown;
  onUnsubscribe: () => void;
  isProcessing: boolean;
  isProcessed: boolean;
  result: ResultData | null;
}

export const UnsubscribePage: React.FC<Props> = ({
  validation,
  isValidating,
  validationError,
  onUnsubscribe,
  isProcessing,
  isProcessed,
  result,
}) => {
  // Show loading state while validating token
  if (isValidating) {
    return (
      <div className={classes.root}>
        <div className={classes.mainCard}>
          <div className={classes.mailImageWrapper}>
            <div className={classes.mailImage}>
              <Image
                src={letterImage}
                alt="Email Image"
                className={classes.image}
              />
            </div>
          </div>
          <div className={classes.mainContent}>
            <div className={classes.header}>
              <div className={classes.title}>Email Unsubscribe</div>
              <div className={classes.subtitle}>Validating your request...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if validation failed
  if (validationError || (validation && !validation.isValid)) {
    const errorMessage = validation?.isExpired
      ? 'This unsubscribe link has expired. Please contact support if you need assistance.'
      : validation?.error ||
        'Invalid unsubscribe link. Please check the link or contact support.';

    return (
      <div className={classes.root}>
        <div className={classes.mainCard}>
          <div className={classes.mailImageWrapper}>
            <div className={classes.mailImage}>
              <Image
                src={letterImage}
                alt="Email Image"
                className={classes.image}
              />
            </div>
          </div>
          <div className={classes.mainContent}>
            <div className={classes.header}>
              <div className={classes.title}>Email Unsubscribe</div>
              <div className={classes.subtitle}>Unable to process request</div>
            </div>
            <div className={classes.errorResult}>
              <div className={classes.textBlockError}>{errorMessage}</div>
              <div className={classes.helpText}>
                <p>
                  You can manage your email notification preferences in the
                  FireAlert app:
                </p>
                <div className={classes.appLinks}>
                  <a
                    href="https://play.google.com/store/apps/details?id=eco.pp.firealert"
                    target="_blank"
                    rel="noopener noreferrer">
                    Android
                  </a>
                  {' | '}
                  <a
                    href="https://apps.apple.com/app/fire-alert-for-forests/id1667307676"
                    target="_blank"
                    rel="noopener noreferrer">
                    iOS
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show result after processing
  if (isProcessed && result) {
    return (
      <div className={classes.root}>
        <div className={classes.mainCard}>
          <div className={classes.mailImageWrapper}>
            <div className={classes.mailImage}>
              <Image
                src={letterImage}
                alt="Email Image"
                className={classes.image}
              />
            </div>
          </div>
          <div className={classes.mainContent}>
            <div className={classes.header}>
              <div className={classes.title}>Email Unsubscribe</div>
              <div className={classes.subtitle}>
                {result.success
                  ? 'Unsubscribe Successful'
                  : 'Unsubscribe Failed'}
              </div>
            </div>
            <div className={classes.result}>
              <div
                className={
                  result.success
                    ? classes.textBlockSuccess
                    : classes.textBlockError
                }>
                {result.message}
              </div>
              {result.success && (
                <div className={classes.helpText}>
                  <p>
                    You can re-enable email notifications anytime through the
                    FireAlert app:
                  </p>
                  <div className={classes.appLinks}>
                    <a
                      href="https://play.google.com/store/apps/details?id=eco.pp.firealert"
                      target="_blank"
                      rel="noopener noreferrer">
                      Android
                    </a>
                    {' | '}
                    <a
                      href="https://apps.apple.com/app/fire-alert-for-forests/id1667307676"
                      target="_blank"
                      rel="noopener noreferrer">
                      iOS
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show confirmation screen
  return (
    <div className={classes.root}>
      <div className={classes.mainCard}>
        <div className={classes.mailImageWrapper}>
          <div className={classes.mailImage}>
            <Image
              src={letterImage}
              alt="Email Image"
              className={classes.image}
            />
          </div>
        </div>
        <div className={classes.mainContent}>
          <div className={classes.header}>
            <div className={classes.title}>Email Unsubscribe</div>
            <div className={classes.subtitle}>
              Confirm your unsubscribe request
            </div>
          </div>
          <div className={classes.confirmationContent}>
            {validation?.alertMethodDestination && (
              <div className={classes.emailInfo}>
                <p>You are about to unsubscribe the email address:</p>
                <div className={classes.emailAddress}>
                  {validation.alertMethodDestination}
                </div>
                <p>from receiving FireAlert notifications.</p>
              </div>
            )}
            <div className={classes.warningText}>
              You will no longer receive fire alert notifications via email. You
              can re-enable notifications anytime through the FireAlert mobile
              app.
            </div>
          </div>
          <button
            className={classes.unsubscribeButton}
            onClick={onUnsubscribe}
            disabled={isProcessing}>
            <div className={classes.unsubscribeText}>
              {isProcessing ? 'Processing...' : 'Confirm Unsubscribe'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
