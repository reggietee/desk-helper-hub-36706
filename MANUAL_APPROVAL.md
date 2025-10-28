# Manual User Approval Instructions

If the approval email isn't working, you can manually approve users through the database.

## To Approve a User Manually:

1. Go to your backend dashboard
2. Navigate to the SQL Editor or Table Editor
3. Find the user in the `profiles` table
4. Update their status to 'approved' and set the approved_at timestamp

### SQL Command:
```sql
-- Replace 'user-email@example.com' with the actual user's email
UPDATE profiles 
SET status = 'approved', 
    approved_at = NOW() 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'user-email@example.com'
);
```

## To Check Pending Users:

```sql
SELECT 
  p.id,
  p.full_name,
  p.status,
  p.created_at,
  au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;
```

## Quick Approve All Pending Users (use with caution):

```sql
UPDATE profiles 
SET status = 'approved', 
    approved_at = NOW() 
WHERE status = 'pending';
```

---

**Note:** Once you approve a user manually, they'll be able to log in immediately. The approval email system will be automatically working once the edge functions are properly deployed and the RESEND_API_KEY is configured.