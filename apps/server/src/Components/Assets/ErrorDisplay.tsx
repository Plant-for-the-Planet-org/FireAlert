import React from 'react';
import classes from './ErrorDisplay.module.css';

interface ErrorDisplayProps {
  message: string;
  httpStatus: number;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, httpStatus }) => {
  return (
    <div className={classes.root}>
      <div className={classes.mainCard}>
          <h2>{httpStatus} Error</h2>
          <p>{message}</p>
      </div>
    </div>

  );
};

export default ErrorDisplay;