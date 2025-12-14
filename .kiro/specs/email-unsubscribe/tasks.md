# Implementation Plan

- [x] 1. Create encryption utilities for unsubscribe tokens

  - Implement AES-256-GCM encryption and decryption functions
  - Create token payload interface and validation logic
  - Add URL-safe base64 encoding/decoding
  - Define encryption constants (to be moved to environment variables later)
  - _Requirements: 2.1, 2.2, 4.1_

- [ ]\* 1.1 Write property test for token encryption security

  - **Property 4: Token generation meets security requirements**
  - **Validates: Requirements 2.1**

- [ ]\* 1.2 Write property test for token expiration

  - **Property 5: Token expiration is correctly set**
  - **Validates: Requirements 2.2**

- [ ]\* 1.3 Write property test for token structure

  - **Property 11: Tokens are properly encrypted and self-contained**
  - **Validates: Requirements 4.1**

- [x] 2. Create unsubscribe service layer

  - Implement UnsubscribeService with token generation and validation
  - Add token decryption and payload validation logic
  - Create error handling for invalid/expired tokens
  - Implement AlertMethod lookup and validation
  - _Requirements: 1.2, 1.5, 2.3_

- [ ]\* 2.1 Write property test for token validation

  - **Property 6: Token validation checks authenticity and expiration**
  - **Validates: Requirements 2.3**

- [ ]\* 2.2 Write property test for invalid token handling

  - **Property 3: Invalid tokens produce appropriate errors**
  - **Validates: Requirements 1.5**

- [x] 3. Integrate unsubscribe links into email notifications

  - Modify SendNotifications.ts to generate unsubscribe tokens for email alerts
  - Update email template to include unsubscribe URL placeholder
  - Enhance EmailNotifier to include unsubscribe links in email content
  - Update email template string to include unsubscribe link in footer
  - _Requirements: 1.1, 4.2_

- [ ]\* 3.1 Write property test for email unsubscribe links

  - **Property 1: Email notifications contain unsubscribe links**
  - **Validates: Requirements 1.1**

- [x] 4. Create tRPC API endpoints for unsubscribe functionality

  - Create new unsubscribe router with public procedures
  - Implement validateToken query endpoint
  - Implement processUnsubscribe mutation endpoint
  - Add input validation schemas using Zod
  - _Requirements: 1.2, 1.3, 4.3_

- [ ]\* 4.1 Write property test for valid token processing

  - **Property 2: Valid tokens enable successful unsubscribe**
  - **Validates: Requirements 1.2, 1.3**

- [ ]\* 4.2 Write property test for idempotent unsubscribe

  - **Property 7: Unsubscribe is idempotent for valid tokens**
  - **Validates: Requirements 2.4, 6.1**

- [x] 5. Implement unsubscribe processing logic

  - Create function to disable AlertMethod via isEnabled field
  - Add validation to ensure user owns the AlertMethod
  - Implement audit logging for unsubscribe actions
  - Handle edge cases (deleted AlertMethod, deleted User)
  - _Requirements: 3.1, 3.4, 3.5, 6.2_

- [ ]\* 5.1 Write property test for AlertMethod disabling

  - **Property 8: Disabled AlertMethods prevent notifications**
  - **Validates: Requirements 3.2**

- [ ]\* 5.2 Write property test for audit logging

  - **Property 9: Unsubscribe actions are logged**
  - **Validates: Requirements 3.4**

- [ ]\* 5.3 Write property test for data preservation

  - **Property 10: AlertMethod records are preserved**
  - **Validates: Requirements 3.5**

- [ ]\* 5.4 Write property test for deleted AlertMethod handling

  - **Property 15: Deleted AlertMethod tokens show appropriate errors**
  - **Validates: Requirements 6.2**

- [x] 6. Create Next.js pages for unsubscribe user interface

  - Create /unsubscribe/[token] dynamic page route
  - Implement unsubscribe confirmation page with success messaging
  - Create error pages for invalid/expired tokens
  - Add consistent branding and styling
  - _Requirements: 1.4, 5.1, 5.3, 5.4, 5.5_

- [ ]\* 6.1 Write property test for confirmation page content

  - **Property 4: Successful unsubscribe shows confirmation**
  - **Validates: Requirements 1.4**

- [ ]\* 6.2 Write property test for mobile app information

  - **Property 12: Confirmation pages contain mobile app information**
  - **Validates: Requirements 5.2**

- [ ]\* 6.3 Write property test for expired token messages

  - **Property 13: Expired tokens show specific error messages**
  - **Validates: Requirements 5.4**

- [x] 7. Update notification filtering to respect unsubscribe status

  - Modify SendNotifications.ts to check AlertMethod.isEnabled status
  - Ensure disabled email AlertMethods are excluded from notification processing
  - Add logging for skipped notifications due to unsubscribe status
  - _Requirements: 3.2_

- [ ]\* 7.1 Write property test for notification filtering

  - **Property 8: Disabled AlertMethods prevent notifications** (integration test)
  - **Validates: Requirements 3.2**

- [x] 8. Implement comprehensive error handling

  - Add graceful handling for multiple token uses
  - Implement proper error pages with user-friendly messages
  - Add error logging for debugging and monitoring
  - Handle database connection failures gracefully
  - _Requirements: 6.1, 6.3, 6.4_

- [ ]\* 8.1 Write property test for multiple token usage

  - **Property 16: Multiple token uses are handled gracefully**
  - **Validates: Requirements 6.4**

- [x] 9. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ]\* 10. Write integration tests for complete unsubscribe workflow

  - Test end-to-end flow from email generation to unsubscribe confirmation
  - Test error scenarios with real database connections
  - Test email template rendering with unsubscribe links
  - Verify notification filtering works correctly

- [ ]\* 11. Write unit tests for edge cases and specific scenarios

  - Test token encryption/decryption with various payloads
  - Test error handling for malformed tokens
  - Test AlertMethod and User validation logic
  - Test audit logging functionality
  - Test Next.js page rendering with different token states

- [x] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
