## TL;DR

**NodeAuth** is a secure, session-aware authentication system built with TypeScript, Node.js, Express, PostgreSQL (via Sequelize), and JWT. It:

- Supports **signup, login, email verification, password reset, token refresh, and logout**.
- Uses JWTs for **access (15 min)** and **refresh (14 days)** tokens, sent as HttpOnly cookies.
- Ties tokens to server-side **Sessions**, so tokens are only valid if the session exists and hasn’t expired.
- Prevents token theft from being sufficient for impersonation by requiring both JWT and valid DB session.
- Sends **email verification and reset tokens** using the Resend API.
- Features modular structure with validation (Zod), error handling, and cookie/session utilities.
- Plans future support for **social logins** (Google, GitHub, etc.).

Run it locally with `npm install`, `npm run push`, and `npm run dev`. Environment variables go in `.env.local`.

---

# NodeAuth

NodeAuth is a Node.js/Express authentication service written in TypeScript. It uses PostgreSQL (via Sequelize) for user/session data and JSON Web Tokens (JWT) stored in cookies for authentication. Unlike a purely stateless JWT system, NodeAuth tracks user sessions in the database _and_ signs each token with a session ID. This “hybrid” approach combines fast JWT validation with server-side session control – access tokens are short-lived (15 min) and must be refreshed using a valid session.

## Installation

1. **Prerequisites:** Ensure you have Node.js (>=16) and a PostgreSQL database running.

2. **Clone the repo:** `git clone <repo-url>` and `cd nodeauth`.

3. **Install dependencies:** Run `npm install`.

4. **Configure environment:** Create a `.env.local` file at the root with:

   ```env
   NODE_ENV=development
   PORT=3000
   APP_ORIGIN=http://localhost:3000
   DATABASE_URL=postgres://user:pass@localhost:5432/dbname
   EMAIL_FROM=your@email.com
   RESEND_API_KEY=your_resend_api_key
   SALT_ROUNDS=10
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   ```

5. **Sync database schema:**

   ```bash
   npm run push
   ```

6. **Run the server:**

   ```bash
   npm run dev
   ```

---

## File Structure

```
src/
├── server.ts                 # Express entrypoint
├── auth/
│   ├── auth.route.ts         # Route definitions
│   ├── auth.controller.ts    # Route handlers
│   └── auth.schema.ts        # Zod schemas
├── db/
│   ├── db.ts                 # Sequelize config
│   ├── sync.ts               # DB sync script
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── account.model.ts
│   │   ├── session.model.ts
│   │   ├── verification.model.ts
│   │   └── associations.ts
├── middleware/
│   ├── authHandler.ts
│   └── errorHandler.ts
├── lib/
│   ├── AppError.ts
│   ├── date.ts
│   ├── httpStatusCode.ts
│   ├── emailTemplates.ts
│   └── utils/
│       ├── env.ts
│       ├── cookies.ts
│       ├── sendMail.ts
│       ├── userToken.ts
│       ├── appAssert.ts
│       └── catchAsyncErrors.ts
```

---

## Authentication Flow & Sessions

1. **Signup:** `POST /auth/signup`

   - Body: `{ email, name, password }`
   - Response: 201 with email verification link sent.

2. **Verify Email:** `POST /auth/email/verify?token=...`

   - Response: 201 and sets accessToken + refreshToken cookies.

3. **Login:** `POST /auth/login`

   - Body: `{ email, password }`
   - Response: 201 and sets cookies.

4. **Token Refresh:** `POST /auth/refresh`

   - Uses refreshToken cookie
   - Response: 200 and sets new accessToken (and possibly refreshToken).

5. **Logout:** `GET /auth/logout`

   - Deletes session and clears cookies.

6. **Password Reset Flow:**

   - `POST /auth/password/forgot` → sends reset link
   - `POST /auth/password/reset?token=...` → resets password, destroys sessions

---

## Session & Cookies

- **accessToken:** JWT `{ userId, sessionId }`, expires in 15 min.
- **refreshToken:** JWT `{ sessionId }`, expires in 14 days.
- Stored in `HttpOnly`, `SameSite=Strict` cookies.
- `refreshToken` cookie scoped to `/auth/refresh`.
- Tokens are only valid if session exists in DB.

---

## Routes Summary

| Method | Path                    | Description                |
| ------ | ----------------------- | -------------------------- |
| POST   | `/auth/signup`          | Register new user          |
| POST   | `/auth/email/verify`    | Verify email via token     |
| POST   | `/auth/login`           | Log in with credentials    |
| POST   | `/auth/password/forgot` | Send password reset email  |
| POST   | `/auth/password/reset`  | Reset password using token |
| POST   | `/auth/refresh`         | Refresh access token       |
| GET    | `/auth/logout`          | Logout and clear session   |

---

## Middleware

- `authHandler`: Verifies access token from cookie, sets `req.userId`.
- `errorHandler`: Centralized error catching and formatting.

---

## Error Handling

- Zod validation → 400 Bad Request
- Invalid auth → 401 Unauthorized
- Server errors → 500 Internal Server Error
- Refresh errors → Cookies cleared automatically

---

## Future Work

- Add OAuth support for Google, GitHub, etc.
- Rate limiting and brute-force protection
- Session history view and device management

---
