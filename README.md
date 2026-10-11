# Woody Forest Homestay

Software Version: 1.0.0

## Description
A booking website for a single whole-house homestay in the forest. Guests browse photos, check rates and availability, book a stay by uploading a bank-transfer receipt, and track their booking by reference code. The owner signs in to a dashboard to confirm or reject bookings from the uploaded receipt, change prices, manage photos, and edit bank and profile details.

Built with plain HTML, CSS and JavaScript — no framework, no build step, no backend. All data lives in the browser's `localStorage`, so the site runs anywhere a browser can open a folder.

## Features

**Landing page (guest)**
- Hero photo slider with slow zoom and crossfade
- Photo gallery with lightbox
- Rates and a live availability calendar
- Booking form with live price breakdown (weekday / weekend / peak rates, cleaning fee)
- Bank-transfer receipt upload and booking reference code
- Booking tracker (reference + phone) with status stepper
- Responsive layout: bottom navigation bar on phones

**Admin dashboard (owner)**
- Main: pending confirmations, upcoming check-ins, occupancy and revenue at a glance
- Analysis: bookings, revenue, occupancy and status charts
- Booking: filter, search, view receipt, confirm / reject / cancel with a note to the guest
- Customer: every guest with stays, spend and booking history
- Setting: homestay profile, pricing (weekend nights, peak ranges, blocked dates), images (add, reorder, set hero, remove), bank details, owner account
- Responsive layout: drawer sidebar and bottom navigation on phones

## Running the site

Open `index.html` directly in a browser, or serve the folder so the admin login works on every browser:

```
python -m http.server 8080
```

Then open:

- Landing page: http://localhost:8080/
- Owner dashboard: http://localhost:8080/admin/login.html

Port 8080 is fixed. If it is already in use, another copy of the server is probably running — use that one, or stop it with `netstat -ano | findstr :8080` and `taskkill /PID <pid> /F`.

## Demo login

| Field | Value |
|---|---|
| Username | `owner` |
| Password | `woody123` |

Change the password under **Setting > Account** after signing in.

## Demo data and reset

The site seeds itself with sample bookings and customers the first time it opens. To start fresh, open the browser console on any page and run:

```js
localStorage.clear(); location.reload();
```

Uploaded receipts and owner-added photos are stored in `localStorage` as well, so they stay on the device and browser where they were added.

## Project structure

```
index.html              Landing page
admin/login.html        Owner sign-in
admin/dashboard.html    Owner dashboard (Main, Analysis, Booking, Customer, Setting)
css/                    base.css (tokens + animations), landing.css, admin.css
js/                     store.js (data + pricing engine), ui.js, landing.js, admin.js, charts.js
assets/img/             Homestay photos, logo and favicon
tools/                  Developer scripts (image generation) — not needed to run the site
```

## Technology

- HTML5, CSS3 (custom properties, grid, backdrop-filter), vanilla JavaScript (ES2020)
- Chart.js (CDN) for the Analysis charts
- Google Fonts: Cormorant Garamond and Manrope
