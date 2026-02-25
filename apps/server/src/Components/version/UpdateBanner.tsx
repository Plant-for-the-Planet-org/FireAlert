'use client';

import React, {useEffect, useState} from 'react';
import {versionCheckService} from '../../services/version/versionCheckService';
import type {VersionCheckState} from '../../services/version/versionCheckService';
import classes from './UpdateBanner.module.css';

const UpdateBanner = () => {
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

  const handleUpdateNow = () => {
    versionCheckService.updateNow();
  };

  const handleDismiss = () => {
    versionCheckService.dismissSoftUpdate();
  };

  // Only show banner for soft updates
  if (state.updateRequired !== 'soft') {
    return null;
  }

  return (
    <div className={classes.banner}>
      <div className={classes.content}>
        <p className={classes.message}>
          {state.updateMessage ||
            'A new version is available. Refresh to get the latest updates.'}
        </p>
        <div className={classes.buttonContainer}>
          <button
            onClick={handleUpdateNow}
            className={classes.updateButton}
            type="button">
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            className={classes.dismissButton}
            type="button">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;
