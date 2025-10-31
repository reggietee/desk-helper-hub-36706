# Production Setup Guide

## Required Actions Before Production Deployment

### 1. Update hCaptcha Configuration

**Current Status**: Using test site key

The application currently uses hCaptcha's test site key (`10000000-ffff-ffff-ffff-000000000001`). This key always passes validation and is intended for development only.

**Action Required**:
1. Sign up for hCaptcha at https://www.hcaptcha.com/
2. Create a new site and obtain your production site key
3. Update `src/components/auth/HCaptcha.tsx`:
   ```tsx
   <HCaptcha
     sitekey="YOUR_PRODUCTION_SITE_KEY_HERE" // Replace this
     ...
   />
   ```
4. Your `HCAPTCHA_SECRET_KEY` is already configured in Lovable Cloud

### 2. Verify Resend Email Configuration

**Action Required**:
1. Log in to https://resend.com
2. Verify your sending domain at https://resend.com/domains
3. Ensure `RESEND_API_KEY` is properly configured (already done)
4. Update the `from` address in edge functions if needed:
   - `supabase/functions/send-otp/index.ts`
   - `supabase/functions/verify-otp/index.ts`
   - `supabase/functions/send-notification/index.ts`
   
   Current: `"Haven Workspace <onboarding@resend.dev>"`
   Replace with: `"Haven Workspace <noreply@yourdomain.com>"`

### 3. Security Configuration Review

**Rate Limiting Thresholds**:
- Current: 5 attempts per 15 minutes
- Location: `supabase/functions/send-otp/index.ts`
- Review and adjust based on your user base

**OTP Expiry Time**:
- Current: 5 minutes
- Location: `supabase/functions/send-otp/index.ts`
- Recommended to keep as-is for security

**Session Lifetime**:
- Current: 8 hours (configured in Supabase client)
- Location: Handled by Supabase Auth
- Adjust if needed based on security requirements

### 4. Database Maintenance Setup

**Recommended Maintenance Tasks**:

```sql
-- Set up periodic cleanup of old audit logs (recommended: keep 90 days)
-- Run this as a scheduled database function or cron job
DELETE FROM auth_attempt_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean up expired OTP tokens (already automated via function)
SELECT cleanup_expired_otp_tokens();

-- Monitor rate-limited IPs
SELECT ip_address, endpoint, attempt_count, locked_until
FROM auth_rate_limits
WHERE locked_until > NOW();
```

### 5. Monitoring and Alerts

**Set up monitoring for**:
1. Failed login attempts (threshold: >10 per hour)
2. Rate limit hits (threshold: >50 per hour)
3. Email delivery failures
4. Database performance (OTP table size)

**Recommended Queries**:

```sql
-- Failed attempts in last hour
SELECT COUNT(*) as failed_attempts
FROM auth_attempt_logs
WHERE success = false 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Active rate limits
SELECT COUNT(*) as locked_ips
FROM auth_rate_limits
WHERE locked_until > NOW();

-- Recent successful logins
SELECT COUNT(*) as successful_logins
FROM auth_attempt_logs
WHERE success = true 
  AND created_at > NOW() - INTERVAL '1 hour';
```

### 6. Cookie Security (Already Configured)

The following security features are automatically enabled via Supabase:
- ✅ HttpOnly cookies
- ✅ Secure flag (HTTPS only)
- ✅ SameSite protection
- ✅ PKCE flow for auth
- ✅ Auto token refresh

No additional configuration needed.

### 7. Deploy Edge Functions

Edge functions will be automatically deployed with your code. Ensure they're public:

In `supabase/config.toml`:
```toml
[functions.send-otp]
verify_jwt = false

[functions.verify-otp]
verify_jwt = false
```

### 8. Test in Production

**Test Checklist**:
1. [ ] Request OTP code
2. [ ] Verify code works within 5 minutes
3. [ ] Verify expired code is rejected
4. [ ] Verify used code cannot be reused
5. [ ] Test rate limiting (6+ attempts)
6. [ ] Verify CAPTCHA appears after threshold
7. [ ] Complete CAPTCHA and verify it resets rate limit
8. [ ] Check email delivery times
9. [ ] Verify security alert emails (after 3 failures)
10. [ ] Test on mobile devices
11. [ ] Test with screen readers
12. [ ] Verify audit logs are created

### 9. Security Incident Response Plan

**If you detect suspicious activity**:

1. Check the audit logs:
   ```sql
   SELECT * FROM auth_attempt_logs
   WHERE user_email = 'suspicious@email.com'
   ORDER BY created_at DESC;
   ```

2. Block an IP if needed:
   ```sql
   INSERT INTO auth_rate_limits (ip_address, endpoint, attempt_count, locked_until)
   VALUES ('suspicious.ip.address', 'send-otp', 999, NOW() + INTERVAL '24 hours')
   ON CONFLICT (ip_address, endpoint) 
   DO UPDATE SET 
     locked_until = NOW() + INTERVAL '24 hours',
     attempt_count = 999;
   ```

3. Invalidate all OTP tokens for a user:
   ```sql
   UPDATE otp_tokens
   SET used = true
   WHERE user_email = 'user@email.com'
     AND used = false;
   ```

### 10. Performance Optimization

**Database Indexes** (Already Created):
- ✅ `idx_otp_tokens_email` - Fast OTP lookups by email
- ✅ `idx_otp_tokens_token` - Fast token verification
- ✅ `idx_otp_tokens_expires` - Fast expiry checks
- ✅ `idx_rate_limits_ip_endpoint` - Fast rate limit checks
- ✅ `idx_auth_logs_email` - Fast audit log queries
- ✅ `idx_auth_logs_created` - Time-based log queries

**Cleanup Schedule**:
Consider setting up a cron job to run cleanup functions:
```sql
-- Run every hour
SELECT cleanup_expired_otp_tokens();

-- Run daily
DELETE FROM auth_attempt_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Environment Variables Summary

```env
# Already configured in Lovable Cloud
RESEND_API_KEY=<your-key>
HCAPTCHA_SECRET_KEY=<your-key>
SUPABASE_URL=<auto-configured>
SUPABASE_SERVICE_ROLE_KEY=<auto-configured>
SUPABASE_ANON_KEY=<auto-configured>
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
```

## Support and Documentation

- hCaptcha Docs: https://docs.hcaptcha.com/
- Resend Docs: https://resend.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Security Best Practices: https://owasp.org/

## Contact

For security issues, please refer to your security incident response procedures.
