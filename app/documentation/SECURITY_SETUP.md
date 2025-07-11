# Security Setup Instructions

Your admin authentication has been upgraded to use **bcrypt password hashing** and **JWT tokens**. Here's how to set it up:

## 1. Generate a Secure Password Hash

First, choose a strong password and generate its hash:

```bash
# In the app directory
node utilities/generate-password.js YourSecurePassword123
```

This will output something like:
```
Password hash generated:
$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijk

Add this to your .env file:
ADMIN_PASSWORD_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijk
```

## 2. Create .env File

Create a `.env` file in the `app` directory with:

```env
# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
ADMIN_PASSWORD_HASH=paste-your-generated-hash-here
GUEST_PASSWORD_HASH=paste-your-guest-hash-here

# Optional: Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5

# Optional: Override default port
# PORT=3000
```

**Important:** 
- Replace `JWT_SECRET` with a long, random string (at least 32 characters)
- Replace `ADMIN_PASSWORD_HASH` with the hash generated in step 1
- Never commit the `.env` file to version control

## 3. Security Features

✅ **Password Hashing:** Uses bcrypt with salt rounds for secure password storage
✅ **JWT Tokens:** Stateless authentication with 1-hour expiration
✅ **Token Storage:** Tokens stored in localStorage with automatic logout on expiration
✅ **API Protection:** All admin endpoints require valid JWT tokens
✅ **Environment Variables:** Sensitive data stored in environment variables

## 4. How It Works

1. **Login:** User enters password → sent to `/api/auth/login`
2. **Verification:** Server compares password with bcrypt hash
3. **Token Generation:** On success, server generates JWT token
4. **Authentication:** Frontend includes token in Authorization header
5. **Validation:** Server validates token for each admin API call

## 5. Token Management

- **Expiration:** Tokens expire after 1 hour
- **Storage:** Stored in browser localStorage
- **Logout:** Tokens are removed from localStorage
- **Auto-logout:** Invalid/expired tokens trigger automatic logout

## 6. Rate Limiting Configuration

✅ **Built-in Rate Limiting:** The system includes configurable rate limiting to prevent brute force attacks:

- **Default Settings:** 5 login attempts per 15 minutes per IP
- **Configurable via Environment Variables:**
  - `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 900000 = 15 minutes)
  - `RATE_LIMIT_MAX_ATTEMPTS` - Maximum attempts per window (default: 5)

**Common Configurations:**
```bash
# Strict (recommended for production)
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_ATTEMPTS=3      # 3 attempts

# Moderate (balanced)
RATE_LIMIT_WINDOW_MS=600000    # 10 minutes
RATE_LIMIT_MAX_ATTEMPTS=5      # 5 attempts

# Lenient (development/testing)
RATE_LIMIT_WINDOW_MS=300000    # 5 minutes
RATE_LIMIT_MAX_ATTEMPTS=10     # 10 attempts
```

## 7. Production Considerations

- Use a strong JWT secret (consider using a password generator)
- Consider shorter token expiration times for high-security environments
- Adjust rate limiting based on your security requirements
- Use HTTPS in production
- Consider implementing refresh tokens for longer sessions

## 8. Troubleshooting

**Login fails with "Invalid password":**
- Verify the password hash was generated correctly
- Check that the hash is properly set in the .env file

**"Too many login attempts" errors:**
- Rate limiting is active - wait for the time window to expire
- Adjust `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_ATTEMPTS` if needed
- Check server logs for rate limiting activity

**"Access token required" errors:**
- Token may have expired, try logging in again
- Check browser localStorage for 'adminToken' key

**Network errors:**
- Ensure server is running and accessible
- Check browser console for detailed error messages 