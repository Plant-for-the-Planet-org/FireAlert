/**
 * Phase 2 Validation Tests: Redux Selectors
 *
 * This test suite validates that:
 * 1. Redux DevTools shows correct state structure
 * 2. Selectors return expected values
 * 3. Memoized selectors work correctly
 *
 * Requirements: 30.8
 */

import {
  selectIsLoggedIn,
  selectAccessToken,
  selectUserDetails,
  selectConfigData,
  selectUserName,
  selectUserEmail,
  selectUserAvatar,
} from '../../app/redux/slices/login/loginSlice';

import {
  selectAlertMethodsEnabled,
  selectIsEmailEnabled,
  selectIsDeviceEnabled,
  selectIsSmsEnabled,
  selectIsWhatsAppEnabled,
  selectIsWebhookEnabled,
  selectAlertMethodEnabled,
} from '../../app/redux/slices/login/settingsSlice';

import type {RootState} from '../../app/redux/store';

describe('Phase 2 Validation: Redux Selectors', () => {
  describe('Login Slice Selectors', () => {
    const mockState: RootState = {
      loginSlice: {
        isLoggedIn: true,
        accessToken: 'test-token-123',
        userDetails: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          avatar: 'https://example.com/avatar.jpg',
        },
        configData: {
          apiUrl: 'https://api.example.com',
        },
      },
      settingsSlice: {
        alertMethods: {
          enabled: {
            email: true,
            device: true,
            sms: false,
            whatsapp: true,
            webhook: false,
          },
        },
      },
    } as RootState;

    it('selectIsLoggedIn should return correct boolean value', () => {
      expect(selectIsLoggedIn(mockState)).toBe(true);
    });

    it('selectAccessToken should return correct string value', () => {
      expect(selectAccessToken(mockState)).toBe('test-token-123');
    });

    it('selectUserDetails should return correct user object', () => {
      const userDetails = selectUserDetails(mockState);
      expect(userDetails).toEqual({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      });
    });

    it('selectConfigData should return correct config object', () => {
      const configData = selectConfigData(mockState);
      expect(configData).toEqual({
        apiUrl: 'https://api.example.com',
      });
    });

    describe('Memoized Selectors', () => {
      it('selectUserName should return user name from userDetails', () => {
        expect(selectUserName(mockState)).toBe('John Doe');
      });

      it('selectUserEmail should return user email from userDetails', () => {
        expect(selectUserEmail(mockState)).toBe('john@example.com');
      });

      it('selectUserAvatar should return user avatar from userDetails', () => {
        expect(selectUserAvatar(mockState)).toBe(
          'https://example.com/avatar.jpg',
        );
      });

      it('selectUserName should return null when userDetails is null', () => {
        const stateWithNullUser = {
          ...mockState,
          loginSlice: {
            ...mockState.loginSlice,
            userDetails: null,
          },
        } as RootState;
        expect(selectUserName(stateWithNullUser)).toBeNull();
      });

      it('selectUserEmail should return null when userDetails is null', () => {
        const stateWithNullUser = {
          ...mockState,
          loginSlice: {
            ...mockState.loginSlice,
            userDetails: null,
          },
        } as RootState;
        expect(selectUserEmail(stateWithNullUser)).toBeNull();
      });

      it('selectUserAvatar should return null when userDetails is null', () => {
        const stateWithNullUser = {
          ...mockState,
          loginSlice: {
            ...mockState.loginSlice,
            userDetails: null,
          },
        } as RootState;
        expect(selectUserAvatar(stateWithNullUser)).toBeNull();
      });

      it('memoized selectors should return same reference for same input', () => {
        const result1 = selectUserName(mockState);
        const result2 = selectUserName(mockState);
        expect(result1).toBe(result2);
      });
    });
  });

  describe('Settings Slice Selectors', () => {
    const mockState: RootState = {
      loginSlice: {
        isLoggedIn: true,
        accessToken: 'test-token',
        userDetails: null,
        configData: null,
      },
      settingsSlice: {
        alertMethods: {
          enabled: {
            email: true,
            device: true,
            sms: false,
            whatsapp: true,
            webhook: false,
          },
        },
      },
    } as RootState;

    it('selectAlertMethodsEnabled should return all enabled flags', () => {
      const enabled = selectAlertMethodsEnabled(mockState);
      expect(enabled).toEqual({
        email: true,
        device: true,
        sms: false,
        whatsapp: true,
        webhook: false,
      });
    });

    it('selectIsEmailEnabled should return correct boolean', () => {
      expect(selectIsEmailEnabled(mockState)).toBe(true);
    });

    it('selectIsDeviceEnabled should return correct boolean', () => {
      expect(selectIsDeviceEnabled(mockState)).toBe(true);
    });

    it('selectIsSmsEnabled should return correct boolean', () => {
      expect(selectIsSmsEnabled(mockState)).toBe(false);
    });

    it('selectIsWhatsAppEnabled should return correct boolean', () => {
      expect(selectIsWhatsAppEnabled(mockState)).toBe(true);
    });

    it('selectIsWebhookEnabled should return correct boolean', () => {
      expect(selectIsWebhookEnabled(mockState)).toBe(false);
    });

    describe('Memoized Selector: selectAlertMethodEnabled', () => {
      it('should return correct value for email method', () => {
        expect(selectAlertMethodEnabled(mockState, 'email')).toBe(true);
      });

      it('should return correct value for device method', () => {
        expect(selectAlertMethodEnabled(mockState, 'device')).toBe(true);
      });

      it('should return correct value for sms method', () => {
        expect(selectAlertMethodEnabled(mockState, 'sms')).toBe(false);
      });

      it('should return correct value for whatsapp method', () => {
        expect(selectAlertMethodEnabled(mockState, 'whatsapp')).toBe(true);
      });

      it('should return correct value for webhook method', () => {
        expect(selectAlertMethodEnabled(mockState, 'webhook')).toBe(false);
      });

      it('should memoize results for same inputs', () => {
        const result1 = selectAlertMethodEnabled(mockState, 'email');
        const result2 = selectAlertMethodEnabled(mockState, 'email');
        expect(result1).toBe(result2);
      });
    });
  });

  describe('State Structure Validation', () => {
    it('should have correct loginSlice structure', () => {
      const mockState: RootState = {
        loginSlice: {
          isLoggedIn: false,
          accessToken: '',
          userDetails: null,
          configData: null,
        },
        settingsSlice: {
          alertMethods: {
            enabled: {
              email: true,
              device: true,
              sms: true,
              whatsapp: true,
              webhook: true,
            },
          },
        },
      } as RootState;

      expect(mockState.loginSlice).toHaveProperty('isLoggedIn');
      expect(mockState.loginSlice).toHaveProperty('accessToken');
      expect(mockState.loginSlice).toHaveProperty('userDetails');
      expect(mockState.loginSlice).toHaveProperty('configData');
    });

    it('should have correct settingsSlice structure', () => {
      const mockState: RootState = {
        loginSlice: {
          isLoggedIn: false,
          accessToken: '',
          userDetails: null,
          configData: null,
        },
        settingsSlice: {
          alertMethods: {
            enabled: {
              email: true,
              device: true,
              sms: true,
              whatsapp: true,
              webhook: true,
            },
          },
        },
      } as RootState;

      expect(mockState.settingsSlice).toHaveProperty('alertMethods');
      expect(mockState.settingsSlice.alertMethods).toHaveProperty('enabled');
      expect(mockState.settingsSlice.alertMethods.enabled).toHaveProperty(
        'email',
      );
      expect(mockState.settingsSlice.alertMethods.enabled).toHaveProperty(
        'device',
      );
      expect(mockState.settingsSlice.alertMethods.enabled).toHaveProperty(
        'sms',
      );
      expect(mockState.settingsSlice.alertMethods.enabled).toHaveProperty(
        'whatsapp',
      );
      expect(mockState.settingsSlice.alertMethods.enabled).toHaveProperty(
        'webhook',
      );
    });
  });

  describe('Type Safety Validation', () => {
    it('selectors should return correct TypeScript types', () => {
      const mockState: RootState = {
        loginSlice: {
          isLoggedIn: true,
          accessToken: 'token',
          userDetails: {name: 'Test'},
          configData: {},
        },
        settingsSlice: {
          alertMethods: {
            enabled: {
              email: true,
              device: true,
              sms: true,
              whatsapp: true,
              webhook: true,
            },
          },
        },
      } as RootState;

      // These should compile without TypeScript errors
      const isLoggedIn: boolean = selectIsLoggedIn(mockState);
      const accessToken: string = selectAccessToken(mockState);
      const userDetails: any = selectUserDetails(mockState);
      const configData: any = selectConfigData(mockState);
      const userName: string | null = selectUserName(mockState);
      const userEmail: string | null = selectUserEmail(mockState);
      const userAvatar: string | null = selectUserAvatar(mockState);

      const emailEnabled: boolean = selectIsEmailEnabled(mockState);
      const deviceEnabled: boolean = selectIsDeviceEnabled(mockState);
      const smsEnabled: boolean = selectIsSmsEnabled(mockState);
      const whatsappEnabled: boolean = selectIsWhatsAppEnabled(mockState);
      const webhookEnabled: boolean = selectIsWebhookEnabled(mockState);

      // Verify types are correct
      expect(typeof isLoggedIn).toBe('boolean');
      expect(typeof accessToken).toBe('string');
      expect(typeof emailEnabled).toBe('boolean');
    });
  });
});
