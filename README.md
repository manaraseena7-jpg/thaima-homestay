# Thaima Homestay — booking website starter

A responsive four-room homestay website with a booking form, date overlap checks, advance-payment calculation, and Razorpay Checkout integration.

## Important before publishing

This is a starter project, not a live published website. The room rates, room names, photos, exact address, contact details and policies are placeholders. Online payment stays disabled until you add your own Razorpay keys and deploy the server over HTTPS.

## Run locally

1. Install Node.js 18 or newer.
2. Extract this folder and open a terminal inside it.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Without Razorpay keys, you can preview the website and booking form, but payments will not be accepted.

## Activate Razorpay test payments

1. Create a Razorpay account and complete its required business/KYC setup.
2. In the Razorpay dashboard, create API keys in **Test Mode**.
3. Put the test Key ID and Key Secret in `.env`.
4. Keep `ADVANCE_PERCENT=20` or change it to the advance percentage you want.
5. Restart the server and test a complete booking using Razorpay's test payment methods.
6. Only after testing, switch to Live Mode and use live API keys. Never put the Key Secret in browser-side code or share it publicly.

## Before going live, customize

- Replace Room 1–4 names, descriptions and rates in `server.js`, `public/index.html` and `public/app.js`.
- Replace the four sample room images in `public/styles.css` with your own property photos.
- Add the exact street address, map link, check-in/check-out times, occupancy limits, cancellation/refund policy and contact details.
- Add a privacy policy and terms before collecting guest information.
- Configure email/SMS booking notifications and an owner/admin dashboard.
- Deploy to a Node.js hosting provider with HTTPS and persistent storage.

## Important production notes

The included JSON file storage is suitable only for a small local demo. For a real public booking service, use a persistent database (such as PostgreSQL), transactional room locking to prevent simultaneous double bookings, webhook-based payment reconciliation, rate limiting, backups, and secure admin authentication. Do not rely only on the browser payment callback for production confirmation; configure Razorpay webhooks as well.

The current starter checks confirmed bookings for overlapping dates. It does not yet include an owner login/dashboard, automated email notifications, or a production database.


## Thaima Homestay details currently entered

- Location: Thiruvananthapuram, Kerala, India
- Rooms 1–4: ₹2,000 per night each
- Advance payment: 20%
- Contact / WhatsApp: +91 99953 72068
