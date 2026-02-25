/**
 * Web Version Check Service
 *
 * Handles version checking for the web client:
 * - Performs version check on page load
 * - Schedules periodic checks every 24 hours
 * - Handles force update (modal + auto-refresh)
 * - Handles soft update (dismissible banner)
 */

import {VERSION_CONFIG} from '../../config/version';

export type UpdateStatus = 'force' | 'soft' | 'none';

export interface VersionCheckState {
  isChecking: boolean;
  lastCheck: Date | null;
  updateRequired: UpdateStatus;
  updateMessage: string | null;
  serverVersion: string | null;
  countdown: number | null;
}

export type VersionCheckListener = (state: VersionCheckState) => void;

class VersionCheckService {
  private state: VersionCheckState = {
    isChecking: false,
    lastCheck: null,
    updateRequired: 'none',
    updateMessage: null,
    serverVersion: null,
    countdown: null,
  };

  private listeners: Set<VersionCheckListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly FORCE_UPDATE_COUNTDOWN_SECONDS = 10;

  /**
   * Subscribe to version check state changes
   */
  subscribe(listener: VersionCheckListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<VersionCheckState>): void {
    this.state = {...this.state, ...updates};
    this.notifyListeners();
  }

  /**
   * Initialize version checking
   * - Performs initial check
   * - Schedules periodic checks
   */
  async initialize(): Promise<void> {
    // Perform initial check
    await this.checkVersion();

    // Schedule periodic checks every 24 hours
    this.schedulePeriodicChecks();
  }

  /**
   * Schedule periodic version checks
   */
  private schedulePeriodicChecks(): void {
    // Clear existing interval if any
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Schedule new interval
    this.checkInterval = setInterval(() => {
      this.checkVersion();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Perform version check against server
   */
  async checkVersion(): Promise<void> {
    // Skip if already checking
    if (this.state.isChecking) {
      return;
    }

    this.setState({isChecking: true});

    try {
      const response = await fetch('/api/trpc/version.check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientVersion: VERSION_CONFIG.CALVER,
          platform: 'web',
        }),
      });

      if (!response.ok) {
        throw new Error(`Version check failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.result?.data;

      if (!result) {
        throw new Error('Invalid response format');
      }

      // Reset retry count on success
      this.retryCount = 0;

      // Update state based on response
      this.setState({
        isChecking: false,
        lastCheck: new Date(),
        serverVersion: result.serverVersion,
      });

      // Handle different update statuses
      if (result.status === 'force_update') {
        this.handleForceUpdate(result.message);
      } else if (result.status === 'soft_update') {
        this.handleSoftUpdate(result.message);
      } else {
        // Success - no update needed
        this.setState({
          updateRequired: 'none',
          updateMessage: null,
        });
      }
    } catch (error) {
      console.error('Version check failed:', error);

      // Implement exponential backoff retry
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        const backoffDelay = Math.pow(2, this.retryCount) * 1000; // 2s, 4s, 8s

        setTimeout(() => {
          this.checkVersion();
        }, backoffDelay);
      } else {
        // Max retries reached, stop checking
        this.setState({
          isChecking: false,
        });
      }
    }
  }

  /**
   * Handle force update scenario
   * - Show blocking modal
   * - Start countdown
   * - Auto-refresh after countdown
   */
  private handleForceUpdate(message: string): void {
    this.setState({
      updateRequired: 'force',
      updateMessage: message,
      countdown: this.FORCE_UPDATE_COUNTDOWN_SECONDS,
    });

    // Start countdown
    this.startCountdown();
  }

  /**
   * Handle soft update scenario
   * - Show dismissible banner
   */
  private handleSoftUpdate(message: string): void {
    // Check if user has already dismissed this session
    const dismissed = sessionStorage.getItem('soft_update_dismissed');
    if (dismissed) {
      return;
    }

    this.setState({
      updateRequired: 'soft',
      updateMessage: message,
    });
  }

  /**
   * Start countdown for force update
   */
  private startCountdown(): void {
    // Clear existing countdown if any
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      const currentCountdown = this.state.countdown;

      if (currentCountdown === null || currentCountdown <= 0) {
        // Countdown finished, refresh page
        this.refreshPage();
        return;
      }

      // Decrement countdown
      this.setState({
        countdown: currentCountdown - 1,
      });
    }, 1000);
  }

  /**
   * Refresh the page
   */
  private refreshPage(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    window.location.reload();
  }

  /**
   * Dismiss soft update notification
   */
  dismissSoftUpdate(): void {
    // Store dismissal in session storage
    sessionStorage.setItem('soft_update_dismissed', 'true');

    // Update state
    this.setState({
      updateRequired: 'none',
      updateMessage: null,
    });
  }

  /**
   * Manually trigger page refresh (for soft update "Update Now" button)
   */
  updateNow(): void {
    this.refreshPage();
  }

  /**
   * Get current state
   */
  getState(): VersionCheckState {
    return {...this.state};
  }

  /**
   * Cleanup - stop all intervals
   */
  cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const versionCheckService = new VersionCheckService();
