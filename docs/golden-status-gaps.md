# Golden Status -- Gap Analysis & Next Steps

> Snapshot: Saturday March 8, 2026
> Reference: `byteStore.reference/` for patterns we can port to AngularJS.

---

## What's Working

| Area            | Status                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Home page       | Full -- hero, shelves, category grid, brand strip                                                                             |
| Shop page       | Grid + filter panel + sort + query params                                                                                     |
| Product detail  | Breadcrumb, images, info panel, tabbed sections                                                                               |
| Login / Signup  | Split layout, Supabase auth, auto-login, role session                                                                         |
| Navbar + footer | RTL header, category bar, account dropdown, footer                                                                            |
| Product card    | Full -- add-to-cart transforms to stepper, wishlist heart                                                                     |
| Cart / Checkout | Full -- 3-step flow, stock validation, `decrement_stock` RPC                                                                  |
| Storage         | Full -- entire project (auth + cart) moved to `localStorage`                                                                  |
| Services        | `AuthService`, `CartService`, `ApiService`, `ProductService`, `OrderService`, `UserService`, `WishlistService` all registered |
| Search          | Full -- navbar live results + full shop page search with highlighting                                                         |
| Wishlist        | Full -- persistent heart toggle on cards/details + dedicated wishlist page                                                    |

---

## Known Bugs & Missing Features

### A. Search (Complete)

- Implemented live dropdown with debounced filtering and text highlighting.
- Full page search integrated with shop filters using Supabase `ilike`.

### B. Cart Page (stub)

- `views/cart.html` is a placeholder ("...قريبا").
- `CartService` exists (2.2 KB) but isn't wired to any UI.
- **Need**: cart table with image, name, unit price, qty stepper, line total, remove button, subtotal/total.

### C. Checkout Flow (stub)

- No checkout form exists.
- **Need**: inline form (name, phone, address, city) + "Place Order" button.
- On submit: create `orders` row then `order_items` rows via REST.
- Success state: confirmation with order ID.
- byteStore `checkout.html` (15 KB) is a solid reference.

### D. Wishlist (Complete)

- Server-side persistence via Supabase `wishlists` table.
- Optimistic UI updates in `WishlistService`.
- Dedicated `#!/wishlist` page with product grid and empty state.

### E. Product Card -- Add-to-Cart Button UX

- Currently: clicking "Add to Cart" does nothing visible on the card.
- **Expected**: after first click, the button should transform into a `[+] qty [-]` stepper (same pattern used in product detail page).
- This is purely a directive/template change in `views/directives/product-card.html`.

### F. Stock Display in Product Detail

- Stock quantity is not shown on the product detail page.
- **Need**: show "X in stock" or "Out of stock" badge near the add-to-cart area.
- The data is available (`stock` field on products table).

### G. About Us Page (stub)

- `views/about.html` is a placeholder.
- **Need**: static content page -- team info, mission, pharmacy description.
- Lowest effort item. Can be last.

### H. Admin Dashboard (entirely stub)

All 4 admin views are placeholders:

- `views/admin/dashboard.html` -- KPI cards + recent orders
- `views/admin/products.html` -- full CRUD table
- `views/admin/orders.html` -- filterable table + status update + invoice export
- `views/admin/customers.html` -- user table + their orders

All 4 admin controllers are stubs too. byteStore has a single-page `admin.html` (14 KB) we can reference for layout and patterns.

### I. Dashboard Link Visibility

- The admin link in the footer is visible to **all users**, including non-admins.
- **Fix**: `ng-if` on the link, checking `$root.userRole === 'admin'` (or however role is stored).

### J. Profile Dropdown Indicator

- The profile/account icon in the navbar has no visual cue that it's a dropdown.
- **Fix**: add a small chevron-down icon next to the profile icon.

---

## Edge Cases to Validate

### K. Cart Quantity vs Stock

- **Question**: can a user set cart quantity to 100 for a product with 10 in stock?
- **UI**: qty stepper should cap at `product.stock`. Disable the "+" button when `qty >= stock`.
- **Backend**: the order placement endpoint (or a Postgres trigger/RLS check) should reject orders where `qty > stock`. Need to verify if this constraint exists in Supabase.

### L. Stale Cart / Concurrent Stock Depletion

- **Scenario**: User A has 10 of item X in cart. User B buys all 10. User A tries to checkout.
- **Options**:
  1. On checkout submit, re-validate stock via REST. If insufficient, show error and update cart quantities.
  2. Real-time stock sync (overkill for this project).
- **Recommended**: option 1 -- validate at order placement time. Show a clear error message.

---

## Suggested Priority Order

> The golden path: **Search -> Cart -> Checkout -> Order Confirmation**
> Then polish, then admin.

| Priority | Item                                                     | Effort  | Notes                                                                                               |
| -------- | -------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| 1        | [x] **B+C. Cart + Checkout page**                        | High    | Done. Ported from byteStore patterns.                                                               |
| 2        | [x] **A. Search**                                        | Medium  | Done. Navbar live suggestions + shop search.                                                        |
| 3        | [x] **E. Product card add-to-cart UX**                   | Low     | Done. Directive uses `<quantity-stepper>`.                                                          |
| 4        | [x] **F. Stock display in product detail**               | Low     | Done. Shows actual stock count.                                                                     |
| 5        | [x] **I. Dashboard link visibility**                     | Trivial | Done. Footer admin link now renders only for the admin user.                                        |
| 6        | [x] **J. Profile dropdown chevron**                      | Trivial | Done. Navbar account trigger now includes a chevron indicator.                                      |
| 7        | [x] **K. Qty vs stock validation**                       | Medium  | Done. UI cap + fresh stock check at checkout.                                                       |
| 8        | [x]**H. Admin dashboard**                                | High    | 4 views + 4 controllers. Biggest chunk.                                                             |
| 9        | [x] **D. Wishlist**                                      | Low-Med | Done. DB persistence + Wishlist page.                                                               |
| 10       | [x] **G. About Us page**                                 | Low     | Static content, do last.                                                                            |
| 11       | [x] **L. Stale cart handling**                           | Medium  | Done. Re-validates at checkout time.                                                                |
| 12       | [x] **M. Product description rewrite**                   | Medium  | Done. `long_description` column wired as "عن المنتج" section.                                       |
| 13       | [x] **N. Page Transition Animation (fade)**              | Low     | Done. Shell-level transition stage + veil now smooth route swaps with covered exit/enter timing.    |
| 14       | [x] **O. Product reviews**                               | Low     | Done. Reviews section on product detail with avg rating + card grid.                                |
| 15       | [x] **P. Cart items should link to product detail page** | Low     | Done. Cart item image/name and checkout summary item names link to product pages.                   |
| 16       | [x] **Q. Navbar is not sticky**                          | Low     | Done. App shell uses sticky navbar host + flex layout so footer stays at the bottom on short pages. |

---

## Files to Reference from byteStore

| byteStore File  | What to Port                                               |
| --------------- | ---------------------------------------------------------- |
| `cart.html`     | Cart table layout, qty steppers, remove buttons            |
| `checkout.html` | Checkout form, order placement logic                       |
| `shop.html`     | Search bar wiring, filter integration                      |
| `admin.html`    | Sidebar layout, KPI cards, product CRUD table, order table |
| `js/`           | Service patterns, controller logic                         |
| `product.html`  | Stock display pattern, add-to-cart stepper                 |
