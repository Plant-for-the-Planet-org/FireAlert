'use client';

import React, {useEffect, useState} from 'react';
import {versionCheckService} from '../../services/version/versionCheckService';
import type {VersionCheckState} from '../../services/version/versionCheckService';
import classes from './UpdateModal.module.css';

const UpdateModal = () => {
  const [state, setState] = useState<VersionCheckState>(
    versionCheckService.getState(),
  );

  useEffect(() => {
    // Subscribe to version check service state changes
    const unsubscribe = versionCheckService.subscribe(setState);

    return () => {
      unsubscribe();
    };
  }, []);

  // Only show modal for force updates
  if (state.updateRequired !== 'force') {
    return null;
  }

  return (
    <div className={classes.overlay}>
      <div className={classes.modal}>
        <h2 className={classes.title}>Update Required</h2>
        <p className={classes.message}>
          {state.updateMessage ||
            'A critical update is required. The page will refresh automatically.'}
        </p>
        {state.countdown !== null && (
          <p className={classes.countdown}>
            Refreshing in{' '}
            <span className={classes.countdownNumber}>{state.countdown}</span>{' '}
            seconds...
          </p>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;
