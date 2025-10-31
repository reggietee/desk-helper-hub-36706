# Authentication Security Implementation

## Overview
This document describes the enhanced security features implemented in the Haven Workspace authentication system.

## Security Features Implemented

### 1. Secure Cookie Configuration
- **Status**: ✅ Implemented via Supabase Auth
- **Details**: 
  - Supabase handles all authentication cookies automatically with secure flags in production
  - Cookies are HttpOnly by default (prevent client-side JavaScript access)
  - Cookies use Secure flag in HTTPS environments
  - SameSite attribute is set to protect against CSRF
  - PKCE flow enabled for enhanced security
  - 8-hour session lifetime

### 2. Email OTP with 5-Minute Expiry
- **Status**: ✅ Implemented
- **Edge Function**: `send-otp`
- **Database Table**: `otp_tokens`
- **Features**:
  - Generates 6-digit OTP codes
  - Tokens expire after exactly 5 minutes
  - Tokens are stored in database with expiry timestamp
  - Automatic cleanup of expired tokens via `cleanup_expired_otp_tokens()` function

### 3. Single-Use Token Enforcement
- **Status**: ✅ Implemented
- **Edge Function**: `verify-otp`
- **Features**:
  - Tokens marked as `used: true` immediately upon successful verification
  - Expired tokens are marked as used to prevent reuse
  - Failed attempts are tracked and logged
  - Database-level enforcement via RLS policies

### 4. Rate Limiting
- **Status**: ✅ Implemented
- **Database Table**: `auth_rate_limits`
- **Configuration**:
  - Max 5 attempts per IP per 15 minutes
  - Tracks attempts by IP address and endpoint
  - Automatic lockout for 15 minutes after threshold
  - Resets after 15 minutes of no activity
- **Protected Endpoints**:
  - `/send-otp` (email verification code requests)

### 5. CAPTCHA Protection
- **Status**: ✅ Implemented
- **Provider**: hCaptcha
- **Integration**: `@hcaptcha/react-hcaptcha`
- **Features**:
  - Appears after 5 failed login attempts
  - Must be completed before further attempts
  - Server-side verification via `HCAPTCHA_SECRET_KEY`
  - Resets rate limit counter on successful verification
  - Privacy-focused alternative to reCAPTCHA

### 6. Audit Logging
- **Status**: ✅ Implemented
- **Database Table**: `auth_attempt_logs`
- **Logged Information**:
  - User email
  - IP address
  - User agent
  - Success/failure status
  - Failure reason (if applicable)
  - Timestamp of attempt
- **Features**:
  - Users can view their own auth logs via RLS policy
  - Permanent audit trail for security investigations

### 7. Security Notifications
- **Status**: ✅ Implemented
- **Features**:
  - Email alert sent after 3 failed OTP verification attempts
  - Notifies users of suspicious activity
  - Generic error messages prevent account enumeration

## Database Schema

### Tables Created
1. **otp_tokens** - Stores OTP codes with expiry
2. **auth_rate_limits** - Tracks rate limiting per IP/endpoint
3. **auth_attempt_logs** - Audit log of all auth attempts

### Security Functions
1. **cleanup_expired_otp_tokens()** - Removes expired tokens
2. **update_rate_limit_timestamp()** - Auto-updates rate limit timestamps

### Row-Level Security (RLS)
- All authentication tables have RLS enabled
- Direct access blocked via restrictive policies
- Edge functions use service role key to bypass RLS
- Users can only view their own auth logs

## Edge Functions

### send-otp
- **Path**: `/functions/v1/send-otp`
- **Authentication**: Public (no JWT required)
- **Rate Limited**: Yes (5 per 15 min)
- **CAPTCHA Required**: After threshold
- **Features**:
  - IP-based rate limiting
  - CAPTCHA verification
  - Email delivery via Resend
  - Audit logging

### verify-otp
- **Path**: `/functions/v1/verify-otp`
- **Authentication**: Public (no JWT required)
- **Features**:
  - Single-use token validation
  - Expiry checking
  - Failed attempt tracking
  - Security notifications
  - User creation/sign-in
  - Audit logging

## Environment Variables Required

```
RESEND_API_KEY=<your-resend-api-key>
HCAPTCHA_SECRET_KEY=<your-hcaptcha-secret>
SUPABASE_URL=<auto-configured>
SUPABASE_SERVICE_ROLE_KEY=<auto-configured>
```

## Testing Checklist

### OTP Flow
- [x] User can request OTP code
- [x] Code expires after 5 minutes
- [x] Code cannot be reused after verification
- [x] Invalid codes are rejected
- [x] Expired codes are rejected

### Rate Limiting
- [x] 5 attempts allowed within 15 minutes
- [x] CAPTCHA appears after threshold
- [x] Lockout message shows retry time
- [x] CAPTCHA verification resets counter
- [x] Generic error messages prevent enumeration

### Security
- [x] Cookies use secure flags (via Supabase)
- [x] Failed attempts are logged
- [x] Security alerts sent after 3 failures
- [x] RLS policies prevent direct table access
- [x] Audit trail maintained

### User Experience
- [x] Clear error messages
- [x] Resend code functionality
- [x] Proper loading states
- [x] Mobile responsive
- [x] Accessible (keyboard navigation, ARIA labels)

## Security Best Practices Followed

1. ✅ No passwords stored (passwordless authentication)
2. ✅ Short-lived OTP tokens (5 minutes)
3. ✅ Single-use token enforcement
4. ✅ Rate limiting to prevent brute force
5. ✅ CAPTCHA for bot protection
6. ✅ Comprehensive audit logging
7. ✅ Secure cookie handling
8. ✅ RLS policies on all sensitive tables
9. ✅ Generic error messages (prevent enumeration)
10. ✅ IP-based tracking for rate limits
11. ✅ User notifications for suspicious activity
12. ✅ Automatic cleanup of expired data

## Maintenance

### Regular Tasks
1. Monitor `auth_attempt_logs` for suspicious patterns
2. Review rate limit thresholds based on usage
3. Update CAPTCHA keys if compromised
4. Rotate secrets periodically
5. Clean up old audit logs (>90 days) if needed

### Monitoring Queries

```sql
-- Failed login attempts in last 24 hours
SELECT user_email, COUNT(*) as failed_attempts
FROM auth_attempt_logs
WHERE success = false 
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email
ORDER BY failed_attempts DESC;

-- Rate limited IPs
SELECT ip_address, endpoint, attempt_count, locked_until
FROM auth_rate_limits
WHERE locked_until > NOW()
ORDER BY locked_until DESC;

-- Recent successful logins
SELECT user_email, ip_address, created_at
FROM auth_attempt_logs
WHERE success = true
ORDER BY created_at DESC
LIMIT 50;
```

## Known Limitations

1. IP-based rate limiting can affect users behind shared NAT/VPN
2. CAPTCHA may impact accessibility for some users
3. Email delivery depends on Resend service availability
4. Test mode CAPTCHA key used (replace for production)

## Production Deployment

Before deploying to production:

1. [ ] Replace test hCaptcha site key with production key
2. [ ] Verify Resend domain is validated
3. [ ] Test email delivery to various providers
4. [ ] Configure proper domain for cookie settings
5. [ ] Set up monitoring alerts for failed attempts
6. [ ] Document incident response procedures
7. [ ] Review and adjust rate limit thresholds
8. [ ] Enable database backups
9. [ ] Set up log rotation policies
10. [ ] Test CAPTCHA on various devices/browsers
