import React from 'react';

interface ErrorDisplayProps {
  message: string;
  httpStatus: number;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({message, httpStatus}) => {
  return (
    <div
      id="__next"
      style={{
        fontFamily:
          'system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji',
        height: '100vh',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <div style={{lineHeight: '48px'}}>
        <style>
          {`
            body { color: #000; background: #fff; margin: 0 }
            .next-error-h1 { border-right: 1px solid rgba(0,0,0,.3) }
            @media (prefers-color-scheme:dark) {
              body { color: #fff; background: #000 }
              .next-error-h1 { border-right: 1px solid rgba(255,255,255,.3) }
            }
          `}
        </style>
        <h1
          className="next-error-h1"
          style={{
            display: 'inline-block',
            margin: '0 20px 0 0',
            paddingRight: '23px',
            fontSize: '24px',
            fontWeight: 500,
            verticalAlign: 'top',
          }}>
          {httpStatus}
        </h1>
        <div style={{display: 'inline-block'}}>
          <h2 style={{fontSize: '14px', fontWeight: 400, lineHeight: '28px'}}>
            {message}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
