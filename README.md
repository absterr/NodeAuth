TL;DR:
NodeAuth is a secure, session-aware authentication system built with TypeScript, Node.js, Express, PostgreSQL (via Sequelize), and JWT. It:
• Supports signup, login, email verification, password reset, token refresh, and logout.
• Uses JWTs for access (15 min) and refresh (14 days) tokens, sent as HttpOnly cookies.
• Ties tokens to server-side Sessions, so tokens are only valid if the session exists and hasn’t expired.
• Prevents token theft from being sufficient for impersonation by requiring both JWT and valid DB session.
• Sends email verification and reset tokens using the Resend API.
• Features modular structure with validation (Zod), error handling, and cookie/session utilities.
• Plans future support for social logins (Google, GitHub, etc.).

Run it locally with npm install, npm run push, and npm run dev. Environment variables go in .env.local.

NodeAuth is a session-aware JWT-based authentication server built with TypeScript, Node.js, Express, and PostgreSQL (via Sequelize). It provides user signup, login, email verification, password reset, token refreshing, and logout functionality. Rather than purely stateless JWTs, each token is tied to a server-side Session record: when a user logs in or verifies their email, a new session (with a unique UUID) is created in the database. Both the JWT signature (secret) and this session ID are required to validate a token, so stealing just one of them is insufficient to impersonate a user. Tokens are sent to the client in secure HttpOnly cookies (with SameSite=Strict) to prevent XSS/CSRF attacks[1][2]. The access token is short-lived (15 minutes) while a long-lived refresh token (14 days) can be used to obtain new access tokens; if the refresh token expires, the session is destroyed and the user must re-authenticate. This approach ensures consistency: the server always knows which session IDs are valid, enabling explicit logout and forced invalidation (e.g. on password reset).
Features
• User Registration & Email Verification: Sign up with email/name/password. A verification email with a one-time token is sent; when the user clicks the link, their account is activated and a session is created.
• Credential Login: Log in with email and password to create a new session.
• JWT Authentication: Access tokens (15m) and refresh tokens (14d), both sent as HttpOnly cookies. Tokens encode the user ID and session ID (secret-backed JWT).
• Token Refresh: When an access token expires, the client calls the refresh endpoint to get a new access token (and possibly a new refresh token) using the existing refresh token cookie.
• Password Reset: “Forgot Password” flow issues a time-limited reset token via email. Resetting the password destroys all sessions for that user and clears tokens.
• Logout: Clears the current session and cookies.
• Robust Validation & Errors: Uses Zod schemas for input validation; errors are handled uniformly.
Future Work: Adding social login providers (OAuth) is planned. The Account model already supports multiple providers (providerId/accountId fields) for this.

Architecture & File Structure
The project follows a modular structure:
• src/server.ts – Express app entry point. Configures middleware (JSON/body parsing, CORS, cookie parser), mounts routes, and starts the server.
• src/config/ – Database configuration (Sequelize config, though src/db/db.ts actually sets up the connection).
• src/db/ – Database layer:
• db.ts – Initializes Sequelize with DATABASE_URL (Postgres).
• sync.ts – Script to synchronize models to the DB (sequelize.sync).
• models/ – Sequelize models and associations:
o User – stores id, name, email (unique), emailVerified, timestamps.
o Account – authentication accounts for a user. Fields: providerId (e.g. "credential" or future "google"), accountId (e.g. OAuth ID, unused for credentials), password (hashed). Credential accounts require a password (enforced via a before-save hook that hashes the password with bcrypt and SALT_ROUNDS).
o Session – holds id (UUID), userId (FK), userAgent, and expiresAt. Each login or verification creates a Session.
o Verification – one-time tokens for email verification or password reset. Fields: userId, type (enum: email_verification, password_reset, etc), value (random 32-byte hex), expiresAt. A hook auto-generates the value if not provided.
Associations (models/associations.ts): each Account, Session, and Verification belongs to User, and a User has many of each.
• src/auth/ – Authentication logic:
• auth.route.ts – Defines Express routes under /auth:
o POST /signup – sign up (signupHandler).
o POST /email/verify – verify email (verifyEmailHandler).
o POST /login – email/password login (credentialLoginHandler).
o POST /password/forgot – initiate password reset (forgotPasswordHandler).
o POST /password/reset – finalize password reset (resetPasswordHandler).
o POST /refresh – refresh tokens (refreshTokenHandler).
o GET /logout – log out (logoutHandler).
• auth.controller.ts – Implements the above handlers. Each handler is wrapped with catchAsyncErrors (to catch rejected promises) and uses Zod schemas (auth.schema.ts) for input validation. Errors use appAssert(cond, status, msg) which throws a custom AppError if the condition is false.
• auth.schema.ts – Zod schemas for request payloads and queries (signup, login, verify email, forgot/reset password).
• src/lib/ – Utilities and helpers:
• utils/env.ts – Loads and validates environment variables (via Zod). Requires .env.local with keys like PORT, APP_ORIGIN, DATABASE_URL, EMAIL_FROM, RESEND_API_KEY, SALT_ROUNDS, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET.
• utils/cookies.ts – Functions to set and clear auth cookies on responses:
o setAuthCookies({res, accessToken, refreshToken}) sets the accessToken (expires in 15m, HttpOnly, SameSite=Strict) and refreshToken (expires 14d, HttpOnly, SameSite=Strict, Path=/auth/refresh).
o refreshAuthCookies({res, newAccessToken, newRefreshToken}) replaces tokens after refresh (if newRefreshToken is provided, both cookies are reset; otherwise only the access token cookie is updated).
o clearAuthCookies(res) clears both cookies.
• utils/userToken.ts – JWT helper functions:
o signUserToken({payload, options, secret}) – signs a payload with jsonwebtoken, using the provided secret and options (audience is always ["user"]). Payload for access tokens includes { userId, sessionId }, for refresh tokens just { sessionId }.
o verifyUserToken({token, secret}) – verifies a JWT and returns {payload} or {error}.
• utils/sendMail.ts – Uses the Resend API to send emails. Given {to, subject, template, value}, it constructs a URL to the frontend (APP_ORIGIN) including the token, injects it into the HTML template, and sends. Emails are HTML templates (lib/emailTemplates.ts) with a {URL} placeholder.
• utils/appAssert.ts – A small helper to throw AppError if a condition is false.
• date.ts – Convenience functions to compute Date objects for “15 minutes from now”, “two weeks from now”, etc. Used to set token expirations and session expirations.
• httpStatusCode.ts – Defines numeric HTTP status code constants (e.g. OK = 200, CREATED = 201, etc.).
• AppError.ts – A custom error class containing statusCode, message, and an optional errorCode.
• src/middleware/ – Express middlewares:
• errorHandler.ts – Global error handler. It logs the error, and then: if a Zod validation error occurred, it sends a 400 with error details; if an AppError occurred, it sends the specified statusCode and JSON {error, message}. It also clears cookies if the error happened during a token refresh request (path /auth/refresh). (Finally it falls back to a 500).
• authHandler.ts – Authentication-check middleware (not used in the current routes, but ready for protected routes). It reads the accessToken cookie, verifies it, and puts req.userId = payload.userId. If invalid, it throws a 401.
• src/index.d.ts – Type augmentation so that Express.Request has an optional userId property (populated by authHandler).
Overall, this structure cleanly separates concerns (routes vs controllers vs utilities) and ensures type-safety and validation at each step.
Installation
To set up NodeAuth locally:

1. Clone the repository and cd into it.
2. Create a .env.local file (at the project root) with required environment variables. For example:
   NODE_ENV=development
   PORT=3000
   APP_ORIGIN=http://localhost:3000
   DATABASE_URL=postgres://user:pass@localhost:5432/mydb
   EMAIL_FROM=your@email.com
   RESEND_API_KEY=YOUR_RESEND_API_KEY
   SALT_ROUNDS=12
   JWT_ACCESS_SECRET=some_access_secret
   JWT_REFRESH_SECRET=some_refresh_secret
   Adjust values as needed. (APP_ORIGIN is used in email links.)
3. Install dependencies:

   npm install

4. Build the TypeScript:

   npm run build

5. Synchronize the database schema:

   npm run push
   This runs the src/db/sync.ts script to create or alter tables for your models.

6. Start the server:

   npm run dev
   The server will listen on PORT (default 3000).
   Your server is now running locally. It exposes routes under /auth for authentication. For example, http://localhost:3000/auth/signup.
   Middleware & Security Configuration
   • CORS: The server uses the cors middleware, allowing requests from APP_ORIGIN and enabling credentials (Access-Control-Allow-Credentials). This lets the browser send/receive HttpOnly cookies cross-origin.
   • Body Parsing & Cookies: It applies express.json(), express.urlencoded(), and cookie-parser so request bodies and cookies are parsed.
   • Auth Middleware: The authHandler (in src/middleware/authHandler.ts) can be applied to protected routes to enforce authentication. It reads the accessToken cookie, verifies it with the JWT access secret, and populates req.userId. If the token is missing/invalid/expired, it triggers a 401.
   • Error Handling: The custom errorHandler catches all errors. Zod validation errors return 400 Bad Request with details; our AppErrors return their specified status code and message; all other errors fall back to 500 Internal Server Error. Notably, if an error occurs during token refresh (endpoint /auth/refresh), the handler will clear the auth cookies to prevent stale tokens on the client.
   This configuration (HttpOnly, Secure, SameSite cookies; JWTs signed with secrets; server-side session checks) follows security best practices[2][3]. In particular, cookies are marked HttpOnly and SameSite=Strict so they are not accessible via JavaScript and aren’t sent on third-party requests[1]. Sessions have explicit expirations and can be revoked on the server by deleting the Session record.
   Sessions and Cookies
   When a user logs in or verifies their email, the server creates a new Session record in the database (with a random UUID id and an expiresAt timestamp). Then:
   • An access token is signed with payload { userId, sessionId } using JWT_ACCESS_SECRET, expiring in 15 minutes.
   • A refresh token is signed with payload { sessionId } using JWT_REFRESH_SECRET, expiring in 14 days.
   These tokens are sent to the client as cookies via setAuthCookies(res, accessToken, refreshToken):
   • accessToken cookie (default path): HttpOnly, Secure (in production), SameSite=Strict, expires in 15m.
   • refreshToken cookie (path /auth/refresh): HttpOnly, Secure, SameSite=Strict, expires in 14d.
   The server then only needs to verify the JWT signatures on incoming requests and confirm that the encoded sessionId exists and is not expired in the database. Even if an attacker steals a token, without the server’s secrets or without the matching DB session, the token is useless. This hybrid approach gives session awareness (you can destroy a session in the DB to log out a user immediately) while still using JWTs for scalability.
   When the client’s access token expires, it must call POST /auth/refresh (sending the refreshToken cookie automatically). The handler then:
   • Verifies the refresh JWT and fetches the corresponding Session from the DB (ensuring it’s not expired).
   • If the session is about to expire (≤1 day left), it extends expiresAt by two more weeks (issuing a new refresh token).
   • Always issues a new access token (15m).
   • Sends updated cookies via refreshAuthCookies, which replaces only the access cookie (and the refresh cookie if extended).
   If the refresh token itself is expired or the session has expired, the server destroys the session (if not already) and clears cookies, forcing the client to re-login.
   Error Handling
   All request validation is done with Zod. For example, signupSchema requires { name: string, email: string, password: string }. If a request fails validation, the server responds with HTTP 400 and a JSON error describing which fields are invalid. Inside controller logic, we use appAssert(condition, status, message) to throw meaningful AppErrors when something goes wrong (e.g. user not found, invalid token, etc.). The global error handler then formats these as JSON. For instance:
   • If a login fails due to wrong password, it throws a 401 with message "Invalid email or password".
   • If a refresh token is missing or invalid, it throws a 401 with "Invalid refresh token" (and also clears cookies on the refresh endpoint).
   • Zod parse errors return a list of validation issues and a 400 status.
   This ensures clients always get consistent HTTP status codes and JSON error messages.
   API Endpoints (Authentication Routes)
   Below are the main /auth endpoints. All endpoints expect/return JSON (except where noted) and use HTTP status codes. Cookies for tokens are set/cleared by the server; clients should send credentials (cookies) with each request.
   • POST /auth/signup (src/auth/auth.controller.ts: signupHandler)
   • Request Body:

   {
   "name": "Alice Evans",
   "email": "alice@example.com",
   "password": "nothingBeatsAJet2Holiday!"
   }
   • Behavior: Validates input, ensures email is not already used. Creates a new User and a credential Account, then creates an email verification Verification token (expires in 24h) and sends a verification email to the user (using a template with a link).
   • Response: 201 Created with JSON:
   {
   "success": true,
   "message": "Account created. Verification email sent"
   }
   (No cookies are set yet; user must verify email first.)
   • POST /auth/email/verify?token=<token> (src/auth/auth.controller.ts: verifyEmailHandler)
   • Request: The user clicks the link from their email, which should hit this endpoint with the token query parameter. Include a header User-Agent automatically sent by the browser.
   • Behavior: Validates the token, looks up the Verification record. If valid, it marks user.emailVerified = true, deletes the verification record, and creates a new Session (with the user agent). It then issues tokens and sets cookies via setAuthCookies.
   • Response: 201 Created with no JSON body. Instead, Set-Cookie headers are sent:
   Set-Cookie: accessToken=<JWT>; HttpOnly; SameSite=Strict; Max-Age=900
   Set-Cookie: refreshToken=<JWT>; Path=/auth/refresh; HttpOnly; SameSite=Strict; Max-Age=1209600
   The user is now logged in with a valid session.
   • POST /auth/login (src/auth/auth.controller.ts: credentialLoginHandler)
   • Request Body:

   {
   "email": "alice@example.com",
   "password": "nothingBeatsAJet2Holiday!"
   }
   (The User-Agent header is automatically provided by the browser.)
   • Behavior: Finds the user and their credential account, checks the bcrypt-hashed password, creates a new Session, and issues JWT cookies (as above).
   • Response: 201 Created with no JSON body; cookies are set like /email/verify. On success, the user is authenticated.
   • POST /auth/password/forgot (src/auth/auth.controller.ts: forgotPasswordHandler)
   • Request Body:

   {
   "email": "alice@example.com"
   }
   • Behavior: If the email exists, creates a Verification token of type password_reset (expires in 15m). Sends a password-reset email containing a link to /auth/password/reset?token=<token>. (Rate limits to 1 per user.)
   • Response: 201 Created with JSON:
   {
   "success": true,
   "message": "Password reset email sent."
   }
   • POST /auth/password/reset?token=<token> (src/auth/auth.controller.ts: resetPasswordHandler)
   • Request: Query param token (from email link). Body must include a new password:

   {
   "password": "myMomIsKindaHomeless"
   }
   • Behavior: Finds the matching Verification of type password_reset. If valid, updates the user’s credential password to the new hashed password, destroys all Sessions for that user (invalidating existing logins), deletes the verification, and clears cookies.
   • Response: 200 OK with JSON:
   {
   "success": true,
   "message": "Password reset successful"
   }
   (Client should then redirect to login.)
   • POST /auth/refresh (src/auth/auth.controller.ts: refreshTokenHandler)
   • Request: No body needed. The browser automatically sends the refreshToken cookie (path /auth/refresh) with this request.
   • Behavior: Reads the cookie refreshToken. Verifies the JWT (using JWT_REFRESH_SECRET) and finds the Session by sessionId. If the session exists and is not expired, it may extend the session expiration by another two weeks if it’s about to expire. It then issues a new access token (always) and possibly a new refresh token (if extended) and sets them via cookies.
   • Response: 200 OK with JSON:
   { "message": "Refreshed token" }
   Plus updated Set-Cookie headers for accessToken (and refreshToken if extended). If the refresh token is invalid/expired or session gone, it clears cookies and returns a 401 error (handled by the error middleware).
   • GET /auth/logout (src/auth/auth.controller.ts: logoutHandler)
   • Request: Browser should send the accessToken cookie.
   • Behavior: Verifies the access token JWT, deletes the corresponding Session record from the DB, and clears both cookies.
   • Response: 200 OK with JSON:
   {
   "success": true,
   "message": "Logout successful"
   }
   Example Authentication Flow

7. Signup: Client calls POST /auth/signup with name/email/password. The server responds 201 and sends an email.
8. Email Verification: User clicks link /auth/verify-email?token=…. The client (browser) should send a POST to /auth/email/verify?token=…. The server creates a session and responds 201 with auth cookies. The user is now authenticated.
9. Access Protected API: The client sends subsequent requests with the accessToken cookie (e.g. as a Bearer token or cookie). Protected endpoints would require the authHandler middleware to verify req.userId.
10. Token Refresh: After 15 min, client calls POST /auth/refresh (no body). The server verifies the refresh cookie, and if valid, responds 200 with new cookies. Client continues.
11. Logout: Client calls GET /auth/logout. Server deletes the session and clears cookies.
    Session Consistency and Security
    The key design choice is combining JWTs with server-side sessions. Each JWT includes a sessionId that must match a DB record. This means:
    • The server can invalidate sessions at any time (e.g. on logout or password reset) by deleting that record.
    • The tokens are tied to the exact session; an attacker who steals a token would still need the secret and a valid session, limiting risk.
    • Access tokens are short-lived, minimizing exposure window. Refresh tokens are HttpOnly cookies not readable by JavaScript, mitigating XSS theft. The SameSite=Strict setting prevents the cookies from being sent with cross-site requests (mitigating CSRF)[1].
    In summary, NodeAuth achieves the “best of both worlds”: stateless JWT convenience with the control of server sessions. This ensures both client and server stay in sync about session state without compromising security.
    References
    • Secure cookie flags and best practices (HttpOnly, SameSite, Secure)[1][2]
    • JSON Web Token (JWT) usage for stateless authentication[3] (signed with shared secret to verify integrity)

---

[1] [2] Secure cookie configuration - Security | MDN
https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies
[3] JSON Web Token Introduction - jwt.io
https://www.jwt.io/introduction
