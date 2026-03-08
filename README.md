# Medfinder — صيدليتك اونلاين

An Arabic-language online pharmacy storefront built for the Egyptian market. Medfinder lets customers browse pharmaceutical products, get AI-powered assistance via a chatbot, and place orders — while giving admins a full dashboard for managing products, orders, and customers.

**Live demo:** [Medfinder-ITI](https://medfinder-iti.vercel.app/)

## Features

### Storefront

- **Product catalog** with filtering by type, category, brand, and stock status, plus sorting and pagination
- **Live search** with debounced dropdown results and text highlighting
- **Product detail pages** with image gallery, tabbed sections (description, use cases, usage, side effects, warnings), and user reviews
- **Shopping cart** with a 3-step checkout flow (cart → shipping form → confirmation), stock validation, and automatic stock decrement
- **Wishlist** with server-side persistence and optimistic UI
- **Order history** with expandable details and cancellation support (restores stock)

### AI Chatbot

- Floating chat widget powered by **Google Gemini** via a Supabase Edge Function
- Natural language product search in Arabic (Egyptian dialect)
- Prescription image recognition — drag-and-drop, paste, or file upload
- Smart prescription handling: skips prescription-only items and suggests OTC alternatives
- Weighted relevance scoring across product name, active ingredient, brand, use cases, and more
- Rate limiting (15 messages/min, 500/day per user/IP)

### Admin Dashboard

- **KPI cards** — total sales, customer count, low stock alerts, today's orders, product count
- **Revenue chart** — weekly bar chart with Arabic day labels (pure Canvas, no charting library)
- **Product management** — full CRUD with image upload (drag-and-drop to Supabase Storage), category selection, and comma-separated array fields
- **Order management** — status filtering, date filtering, search, status updates, and printable receipts
- **Customer management** — customer list with expandable order history

### Technical

- 3-tier route guard (guest / user / admin)
- HTTP interceptor with automatic auth header injection and 401 token refresh with request queuing
- CSS view transitions (fade exit/enter)
- Scroll-reveal animations via IntersectionObserver
- Full RTL layout (`dir="rtl"`, `lang="ar"`)
- Zero-build, CDN-only — no bundler, no npm, no Node.js required

## Tech Stack

| Layer     | Technology                                        |
| --------- | ------------------------------------------------- |
| Framework | AngularJS 1.8.3                                   |
| UI        | Tailwind CSS (CDN) + Franken UI 2.0.0             |
| Icons     | Lucide                                            |
| Font      | Cairo (Google Fonts)                              |
| Database  | Supabase (PostgreSQL via PostgREST)               |
| Auth      | Supabase Auth (email/password)                    |
| Storage   | Supabase Storage (`product-images` bucket)        |
| Chatbot   | Supabase Edge Function (Deno) + Google Gemini API |

## Project Structure

```
├── index.html                  # SPA entry point
├── js/
│   ├── app.js                  # AngularJS module, global state, search, view transitions
│   ├── config/
│   │   ├── constants.js        # Supabase credentials, category tree
│   │   ├── routes.js           # Route definitions + access control
│   │   └── interceptors.js     # Auth header injection + token refresh
│   ├── services/               # AngularJS services (API, auth, products, cart, orders, etc.)
│   ├── controllers/            # Page controllers (home, shop, product, cart, admin/*)
│   ├── directives/             # Reusable components (product card, chat widget, quantity stepper)
│   └── filters/                # Currency and truncate filters
├── views/
│   ├── *.html                  # Page templates
│   ├── partials/               # Navbar, footer
│   ├── admin/                  # Admin page templates
│   └── directives/             # Directive templates
├── css/
│   ├── base.css                # CSS custom properties, resets
│   ├── layout.css              # App shell, view transitions
│   ├── components.css          # Shared components
│   └── pages/                  # Per-page stylesheets
├── assets/                     # Logo, carousel images, brand logos
└── supabase/
    ├── functions/chatbot/      # Edge function for AI chatbot
    └── migrations/             # SQL migrations
```

## Routes

| Path                       | Page                    | Access |
| -------------------------- | ----------------------- | ------ |
| `/`                        | Homepage                | Public |
| `/shop`                    | Product catalog         | Public |
| `/product/:id`             | Product detail          | Public |
| `/about`                   | About                   | Public |
| `/login`                   | Login / Signup          | Public |
| `/cart`                    | Cart & Checkout         | User   |
| `/wishlist`                | Wishlist                | User   |
| `/orders`                  | Profile & Order History | User   |
| `/admin`                   | Dashboard               | Admin  |
| `/admin/products`          | Product Management      | Admin  |
| `/admin/products/new`      | Add Product             | Admin  |
| `/admin/products/:id/edit` | Edit Product            | Admin  |
| `/admin/orders`            | Order Management        | Admin  |
| `/admin/customers`         | Customer Management     | Admin  |

## Database

8 tables on Supabase (PostgreSQL):

- **products** — 149 product catalog entries with Arabic/English names, pricing, images, categories, and medical metadata
- **profiles** — user profiles synced from `auth.users`
- **orders** / **order_items** — order headers and line items
- **reviews** — product ratings and review text
- **wishlists** — user-product wishlist associations
- **chat_sessions** / **chat_messages** — chatbot conversation history
- **chat_rate_limits** — sliding-window rate limiting for the chatbot

RPC functions: `decrement_stock`, `restore_stock`, `check_chat_rate_limit`, `enforce_chat_limits`.

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Creative-Geek/Medfinder-ITI.git
   cd Medfinder-ITI
   ```

2. **Serve the files** — any static file server will work:

   ```bash
   # Python
   python -m http.server 8000

   # Or use VS Code Live Server, nginx, etc.
   ```

3. **Open in browser** — navigate to `http://localhost:8000`

No build step, no `npm install` — the app loads all dependencies from CDNs.

### Supabase Setup

The app expects a Supabase project with the schema described in `docs/schema.md`. Update `js/config/constants.js` with your own project URL and anon key.

To deploy the chatbot edge function:

```bash
supabase functions deploy chatbot
```

Environment variables needed for the edge function:

- `GEMINI_API_KEY` — Google Gemini API key
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Authors

- **Ahmed Taha**
- **Kareem Elsaid**

Built as an ITI (Information Technology Institute) project.
