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

## Deploy on Render

1. Create a MongoDB Atlas database and allow Render network access. On Render's free plan, Atlas may require `0.0.0.0/0`; use a strong database password.
2. Open the [Render Blueprint deploy page](https://render.com/deploy?repo=https://github.com/Adityasrivastava1730/e-commerce).
3. In the Blueprint form, set `MONGO_URI` to the Atlas connection string and `CLIENT_URL` to the `https://` URL Render assigns to the Lumina storefront.
4. Deploy both services. The API hostname is wired into the client build, and Render generates `JWT_SECRET`.

For separate hosting, set `VITE_API_URL` to the complete API URL ending in `/api` and set the API's `CLIENT_URL` to the storefront origin.

On Windows PowerShell with script execution disabled, use `npm.cmd` in place of `npm`.

http://localhost:5173/