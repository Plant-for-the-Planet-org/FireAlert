# Email Unsubscribe Feature Design

## Overview

The email unsubscribe feature provides a secure, token-based mechanism for users to opt out of email notifications from the FireAlert system. The implementation follows industry best practices for email unsubscribe functionality, ensuring compliance with email marketing regulations while maintaining system security and user experience.

The feature integrates seamlessly with the existing notification system, adding unsubscribe links to email templates and providing secure API endpoints for processing unsubscribe requests. The design emphasizes security through cryptographically secure tokens, proper token expiration, and comprehensive error handling.

## Architecture

The unsubscribe system follows an encryption-based token architecture with the following key components:

### Token Generation Flow

1. **Email Notification Trigger**: When sending email notifications, the system generates encrypted unsubscribe tokens
2. **Token Encryption**: Tokens contain encrypted payload with AlertMethod ID, User ID, and expiration timestamp
3. **Link Embedding**: Unsubscribe links containing encrypted tokens are embedded in email templates
4. **Token Decryption**: When users click links, the system decrypts and validates token payload

### Security Architecture

- **Encryption-Based Security**: Tokens use AES-256-GCM encryption with a secret key
- **Self-Contained Tokens**: All necessary data (AlertMethod ID, User ID, expiration) embedded in token
- **Time-Limited Access**: 30-day expiration embedded in encrypted payload
- **Stateless Design**: No database storage required for tokens
- **Audit Trail**: All unsubscribe actions are logged for compliance

### Integration Points

- **Email Template System**: Unsubscribe links integrated into existing email templates
- **tRPC API**: New endpoints for token validation and unsubscribe processing
- **Next.js Pages**: User-facing pages for unsubscribe confirmation and error handling
- **Prisma ORM**: Database operations using existing ORM patterns

## Components and Interfaces

### Database Schema Extensions

No database schema changes are required. The existing AlertMethod table will be used to track unsubscribe status via the `isEnabled` field.

### API Interfaces

#### Unsubscribe Service Interface

```typescript
interface UnsubscribeService {
  generateToken(alertMethodId: string, userId: string): string;
  validateToken(token: string): UnsubscribeTokenValidation;
  processUnsubscribe(token: string): Promise<UnsubscribeResult>;
}

interface UnsubscribeTokenPayload {
  alertMethodId: string;
  userId: string;
  expiresAt: number; // Unix timestamp
}

interface UnsubscribeTokenValidation {
  isValid: boolean;
  isExpired: boolean;
  payload?: UnsubscribeTokenPayload;
  alertMethod?: AlertMethod;
  user?: User;
}

interface UnsubscribeResult {
  success: boolean;
  message: string;
  alertMethodId?: string;
}

// Encryption utilities
interface TokenEncryption {
  encrypt(payload: UnsubscribeTokenPayload): string;
  decrypt(token: string): UnsubscribeTokenPayload | null;
}
```

#### tRPC Router Extensions

```typescript
// New unsubscribe router
export const unsubscribeRouter = createTRPCRouter({
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      /* validation logic */
    }),

  processUnsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      /* unsubscribe logic */
    }),
});
```

### Email Template Integration

#### Enhanced Email Template

```typescript
interface EmailTemplateData {
  content: string;
  subject: string;
  unsubscribeUrl?: string; // New field for unsubscribe link
}

// Updated template function
export function getEmailTemplate(data: EmailTemplateData): string {
  let template = emailTemplateString;
  template = template.replace("{{email_content}}", data.content);
  template = template.replace("{{email_subject}}", data.subject);
  template = template.replace("{{unsubscribe_url}}", data.unsubscribeUrl || "");
  return template;
}
```

## Data Models

### Encrypted Token Payload

The unsubscribe token contains an encrypted JSON payload with the following structure:

```typescript
interface UnsubscribeTokenPayload {
  alertMethodId: string; // ID of the AlertMethod to unsubscribe
  userId: string; // ID of the User who owns the AlertMethod
  expiresAt: number; // Unix timestamp for token expiration
}
```

### AlertMethod Entity

Uses the existing AlertMethod table with the `isEnabled` field to track subscription status:

- When `isEnabled` is `true`: User receives notifications
- When `isEnabled` is `false`: User is unsubscribed from notifications

### Encryption Configuration

```typescript
interface EncryptionConfig {
  algorithm: "aes-256-gcm";
  keyLength: 32; // 256 bits
  ivLength: 16; // 128 bits
  tagLength: 16; // 128 bits
}

// Constant encryption key (to be moved to environment variable)
const UNSUBSCRIBE_ENCRYPTION_KEY =
  "your-32-byte-secret-key-here-change-this-in-production";
```

### Token Structure

The final token is a URL-safe base64 encoded string containing:

1. **IV (16 bytes)**: Initialization vector for AES-GCM
2. **Encrypted Data**: AES-256-GCM encrypted JSON payload
3. **Auth Tag (16 bytes)**: GCM authentication tag

### Audit Logging

Unsubscribe actions will be logged using the existing logger system:

```typescript
interface UnsubscribeAuditLog {
  action:
    | "unsubscribe_processed"
    | "token_generated"
    | "token_validation_failed";
  userId: string;
  alertMethodId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  errorReason?: string; // For failed validations
}
```

### Token Generation Strategy

- **Encryption**: AES-256-GCM with random IV for each token
- **Encoding**: URL-safe base64 encoding for web compatibility
- **Expiration**: 30 days from creation (configurable via environment variable)
- **Self-Contained**: No database storage required - all data in encrypted payload
- **Tamper-Proof**: GCM authentication prevents token modification

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Property 1: Email notifications contain unsubscribe links
_For any_ email notification sent by the system, the email content should contain a properly formatted unsubscribe URL with a valid token
**Validates: Requirements 1.1**

Property 2: Valid tokens enable successful unsubscribe
_For any_ valid unsubscribe token, processing the token should result in the associated AlertMethod being disabled and a confirmation response
**Validates: Requirements 1.2, 1.3**

Property 3: Invalid tokens produce appropriate errors
_For any_ invalid or expired unsubscribe token, the system should return an appropriate error message without processing the unsubscribe
**Validates: Requirements 1.5**

Property 4: Token generation meets security requirements
_For any_ generated unsubscribe token, the token should have at least 128 bits of entropy and be cryptographically secure
**Validates: Requirements 2.1**

Property 5: Token expiration is correctly set
_For any_ created unsubscribe token, the expiration timestamp should be exactly 30 days from the creation time
**Validates: Requirements 2.2**

Property 6: Token validation checks authenticity and expiration
_For any_ token validation request, the system should verify both that the token exists and that it has not expired
**Validates: Requirements 2.3**

Property 7: Unsubscribe is idempotent for valid tokens
_For any_ valid unsubscribe token, multiple uses should result in the same outcome (AlertMethod disabled) without errors
**Validates: Requirements 2.4, 6.1**

Property 8: Disabled AlertMethods prevent notifications
_For any_ AlertMethod that is disabled via unsubscribe, the notification system should not send emails to that destination
**Validates: Requirements 3.2**

Property 9: Unsubscribe actions are logged
_For any_ processed unsubscribe request, the system should create an audit log entry with timestamp and user information
**Validates: Requirements 3.4**

Property 10: AlertMethod records are preserved
_For any_ unsubscribed AlertMethod, the database record should remain but with isEnabled set to false
**Validates: Requirements 3.5**

Property 11: Tokens are properly encrypted and self-contained
_For any_ generated unsubscribe token, the token should be a valid encrypted payload containing AlertMethod ID, User ID, and expiration
**Validates: Requirements 4.1**

Property 12: Confirmation pages contain mobile app information
_For any_ successful unsubscribe confirmation page, the content should include information about re-enabling notifications through the mobile app
**Validates: Requirements 5.2**

Property 13: Expired tokens show specific error messages
_For any_ expired unsubscribe token, the error response should specifically mention token expiration
**Validates: Requirements 5.4**

Property 14: Unsubscribe is idempotent
_For any_ already disabled AlertMethod, processing an unsubscribe request should complete successfully without errors
**Validates: Requirements 6.1**

Property 15: Deleted AlertMethod tokens show appropriate errors
_For any_ unsubscribe token referencing a deleted AlertMethod, the system should display an appropriate error message
**Validates: Requirements 6.2**

Property 16: Multiple token uses are handled gracefully
_For any_ unsubscribe token used multiple times, subsequent uses should be handled gracefully without system errors
**Validates: Requirements 6.4**

## Error Handling

The unsubscribe system implements comprehensive error handling to ensure graceful degradation and proper user feedback:

### Token Validation Errors

- **Invalid Token Format**: Returns user-friendly error page with guidance
- **Token Decryption Failed**: Displays error indicating the link may be invalid or corrupted
- **Expired Token**: Shows specific message about token expiration with re-subscription guidance
- **Malformed Token Payload**: Handles gracefully with appropriate messaging

### Database Operation Errors

- **Connection Failures**: Logs errors and displays generic error page to users
- **AlertMethod Not Found**: Handles cases where referenced AlertMethod has been deleted
- **User Not Found**: Manages cases where referenced User has been deleted
- **Update Failures**: Implements proper error handling for failed AlertMethod updates

### System Integration Errors

- **Email Template Errors**: Fallback to basic unsubscribe link if template processing fails
- **Logging Failures**: Continues operation even if audit logging fails
- **Encryption Failures**: Handles rare cases where token encryption fails

### User Experience Error Handling

- **Malformed URLs**: Redirects to error page with helpful guidance
- **Missing Parameters**: Validates all required parameters and provides clear error messages
- **Rate Limiting**: Implements basic rate limiting to prevent abuse
- **Cross-Site Request Forgery**: Uses token-based validation to prevent CSRF attacks

## Testing Strategy

The email unsubscribe feature will be validated through a dual testing approach combining unit tests and property-based tests to ensure comprehensive coverage and correctness.

### Unit Testing Approach

Unit tests will focus on specific examples, edge cases, and integration points:

- **Token Generation**: Test encryption, decryption, and token format
- **Token Validation**: Test token parsing and expiration checking
- **Email Template Integration**: Test unsubscribe link insertion in email templates
- **API Endpoints**: Test tRPC router endpoints with specific inputs
- **Error Scenarios**: Test specific error conditions and edge cases
- **Page Rendering**: Test Next.js pages with various token states

### Property-Based Testing Approach

Property-based tests will verify universal properties across all inputs using **fast-check** library for TypeScript. Each property-based test will run a minimum of 100 iterations to ensure thorough validation.

The following correctness properties will be implemented as property-based tests:

- **Property 1**: Email notifications contain unsubscribe links - Generate random notification data and verify unsubscribe URLs are present
- **Property 2**: Valid tokens enable successful unsubscribe - Generate random valid tokens and verify successful processing
- **Property 3**: Invalid tokens produce appropriate errors - Generate random invalid tokens and verify error responses
- **Property 4**: Token generation meets security requirements - Generate many tokens and verify entropy and uniqueness
- **Property 5**: Token expiration is correctly set - Generate tokens and verify expiration timestamps
- **Property 6**: Token validation checks authenticity and expiration - Test validation with various token states
- **Property 7**: Unsubscribe is idempotent for valid tokens - Test repeated unsubscribe operations
- **Property 8**: Disabled AlertMethods prevent notifications - Test notification filtering for disabled methods
- **Property 9**: Unsubscribe actions are logged - Verify audit log creation for all unsubscribe operations
- **Property 10**: AlertMethod records are preserved - Verify data retention after unsubscribe
- **Property 11**: Tokens are properly encrypted and self-contained - Verify token encryption and payload structure
- **Property 12**: Confirmation pages contain mobile app information - Test page content generation
- **Property 13**: Expired tokens show specific error messages - Test error message content for expired tokens
- **Property 14**: Unsubscribe is idempotent - Test repeated unsubscribe operations
- **Property 15**: Deleted AlertMethod tokens show appropriate errors - Test error handling for orphaned tokens
- **Property 16**: Multiple token uses are handled gracefully - Test concurrent and repeated token usage

### Test Data Generation

Property-based tests will use intelligent generators that:

- Create realistic AlertMethod and User data
- Generate tokens with various validity states (valid, expired, used, invalid)
- Produce email content with different structures and formats
- Create edge cases for database constraints and relationships

### Integration Testing

- **End-to-End Flows**: Test complete unsubscribe workflow from email generation to confirmation
- **Database Integration**: Test with real PostgreSQL database using test containers
- **Email Template Rendering**: Test actual email generation with unsubscribe links
- **API Integration**: Test tRPC endpoints with real database connections

### Performance Testing

- **Token Generation Performance**: Verify token generation meets performance requirements
- **Database Query Optimization**: Test query performance with large datasets
- **Cleanup Operation Efficiency**: Test expired token cleanup performance
- **Concurrent Access**: Test system behavior under concurrent unsubscribe requests
