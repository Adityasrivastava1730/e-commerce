# Lumina Commerce

A full-stack MERN e-commerce application with JWT auth, catalog filters, cart, checkout, orders, and admin management.

## Run locally

1. Start MongoDB locally or set `MONGO_URI` to a MongoDB Atlas connection string.
2. `npm install`
3. `npm --prefix server install`
4. `npm --prefix client install`
5. Copy `server/.env.example` to `server/.env`.
6. `npm run seed` to create demo products and the admin account.
7. `npm run dev`

Client: http://localhost:5173 | API: http://localhost:5000

Demo admin: `admin@lumina.store` / `Admin123!`

For production, build the client with `npm run build`, deploy the API and static client separately, and configure `VITE_API_URL` plus `CLIENT_URL`.

## Deploy

- API: deploy `server` to Render, Railway, or Fly.io with `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` environment variables.
- Client: deploy `client` to Vercel or Netlify with `VITE_API_URL=https://your-api-host/api`.
- MongoDB: use MongoDB Atlas and allow the API host's network access.

On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.
