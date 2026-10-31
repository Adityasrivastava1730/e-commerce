# Lumina Commerce

A full-stack MERN e-commerce application with JWT auth, catalog filters, cart, checkout, orders, and admin management.

New accounts verify their email with a one-time code before the account is created. Checkout uses a demo-only payment simulation; it does not process payments or request card details.

## Run locally

1. Start MongoDB locally or set `MONGO_URI` to a MongoDB Atlas connection string.
2. `npm install`
3. `npm --prefix server install`
4. `npm --prefix client install`
5. Copy `server/.env.example` to `server/.env`.
6. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `server/.env` to send verification emails. For local-only testing without SMTP, set `OTP_DEV_MODE=true`; the API will return the code in its response. Never enable this in production.
7. `npm run seed` to create demo products and the admin account.
8. `npm run dev`

Client: http://localhost:5173 | API: http://localhost:5000

Demo admin: `admin@lumina.store` / `Admin123!`

For production, build the client with `npm run build`, deploy the API and static client separately, and configure `VITE_API_URL` plus `CLIENT_URL`.

## Deploy

- API: deploy `server` to Render, Railway, or Fly.io with `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and the SMTP environment variables above. On Render, set the SMTP values in the service environment after creating the Blueprint.
- Client: deploy `client` to Vercel or Netlify with `VITE_API_URL=https://your-api-host/api`.
- MongoDB: use MongoDB Atlas and allow the API host's network access.

The demo payment screen is intentionally non-functional as a real payment method: it only marks an order as `Simulated` and must not be used to collect money.

On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

http://localhost:5173/