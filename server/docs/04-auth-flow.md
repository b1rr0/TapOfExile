# Authentication Flow

## Telegram WebApp → JWT

```
┌──────────────┐    initData    ┌──────────────┐
│  Telegram     │ ──────────── │  POST         │
│  WebApp       │    (signed)   │  /auth/       │
│  Client       │               │  telegram     │
└──────────────┘               └──────┬───────┘
                                      │
                               1. Parse initData
                               2. Validate HMAC-SHA256
                               3. Check auth_date
                               4. Extract user JSON
                                      │
                               ┌──────┴───────┐
                               │  Find/Create  │
                               │  Player in DB │
                               └──────┬───────┘
                                      │
                               ┌──────┴───────┐
                               │  Issue JWT    │
                               │  access (1h)  │
                               │  refresh (30d)│
                               └──────┬───────┘
                                      │
                               { accessToken,
                                 refreshToken,
                                 player }

```

## initData Validation Algorithm

1. Parse `initData` as URL query string
2. Extract and remove `hash` parameter
3. Sort remaining params alphabetically by key
4. Build `data_check_string` = `key1=val1\nkey2=val2\n...`
5. `secret_key` = HMAC-SHA256(`"WebAppData"`, BOT_TOKEN)
6. `check_hash` = HMAC-SHA256(`data_check_string`, secret_key).hex()
7. Compare `check_hash === hash` (reject if mismatch)
8. Verify `auth_date` is within 24 hours

## JWT Token Structure

**Access token** (1 hour):
```json
{
  "sub": "123456789",
  "type": "access",
  "iat": 1706000000,
  "exp": 1706003600
}
```

**Refresh token** (30 days):
- Stored in Redis key `auth:refresh:{telegramId}`
- Invalidated on use (rotation)

## Protected Endpoints

All endpoints except `/auth/*` and `/game-data/*` require:
```
Authorization: Bearer <accessToken>
```

The `JwtAuthGuard` validates the token and injects `request.user = { telegramId }`.
Use `@CurrentUser('telegramId')` decorator to access in controllers.
