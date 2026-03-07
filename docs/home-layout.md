# Home Page Layout -- Medfinder

Reference: `assets/references/ce8ed716804f4c84b2413b88f9e08725.png`

---

## Design Tokens

| Role       | Hex       | Usage                                      |
| ---------- | --------- | ------------------------------------------ |
| Primary    | `#0583f2` | Search bar, prices, links, secondary btns  |
| Accent/CTA | `#f99d1c` | Add-to-cart, promo highlights, active dots |
| Dark       | `#1f1f1f` | Body text, headings                        |
| Card BG    | `#f5f5f5` | Product cards, service cards               |
| Page BG    | `#fdfdff` | Main body background                       |

**Font:** Cairo (CDN). Titles: 26px medium. Body: 24px regular.
**Direction:** RTL throughout. `dir="rtl"` on `<html>`.
**Icons:** Lucide Icons (CDN).
**UI Kit:** Franken UI (CDN).

---

## Section Order (top to bottom)

```
 1. Header (single row)
 2. Category nav bar
 3. Hero carousel
 4. Quick action cards (2 cards)
 5. Product shelf: الأكثر طلبًا
 6. Product shelf: الفيتامينات و المكملات
 7. Category shortcuts grid
 8. Product shelf: بديل للسكر
 9. Brand strip
10. Footer
```

---

## 1. Header

Single row. No separate utility bar -- keeps implementation simple and matches the reference closely enough.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [حسابي]  [أقرب صيدلية]  [العربة]  [المفضلة]  ···  [🔍 search]  LOGO  │
│           ← left side                            center      right → │
└──────────────────────────────────────────────────────────────────────┘
```

RTL order (right to left visually):

- **Right:** Medfinder logo (`assets/logos/logo.svg`)
- **Center:** Search bar. Placeholder: `ما الذي تبحث عنه؟` (matches reference exactly). Blue border on focus.
- **Left (grouped icons/links):**
  - `المفضلة` with heart icon (links to wishlist -- for MVP just scrolls or shows a dropdown; full page later)
  - `العربة` with cart icon + item count badge
  - `حسابي` with user icon (links to `/login` if guest, `/orders` if logged in)

### Rules

- Search bar must be visually dominant (widest element in the row).
- Wishlist icon shows filled heart if user has items (requires auth check).
- Cart badge shows current item count from `CartService`.
- On mobile: search collapses to icon, links become a hamburger menu (later enhancement).

---

## 2. Category Nav Bar

Horizontal bar directly under the header. Light bottom border or slight shadow to separate from content.

Uses the 7 product `type` values from the database:

| Display text            | DB `type` value           |
| ----------------------- | ------------------------- |
| الأدوية                 | `الأدوية`                 |
| الحماية من الفيروسات    | `الحمايه من الفيروسات`    |
| منتجات المرأة           | `منتجات المرأة`           |
| الأم و الطفل            | `الأم و الطفل`            |
| العناية بالبشرة و الشعر | `العناية بالبشرة و الشعر` |
| العناية بالاسنان        | `العناية بالاسنان`        |
| منتجات الرجال           | `منتجات الرجال`           |

### Behavior

- Each item links to `/shop?type=<value>` (pre-filtered shop page).
- Active/hover state: orange underline or text color change.
- Order matches the reference screenshot (right to left): الأدوية first.

---

## 3. Hero Carousel

Full-width banner slider using the 5 existing banner images.

| Slide | Image file             | Product advertised       |
| ----- | ---------------------- | ------------------------ |
| 1     | `assets/images/3.webp` | Redoxon Vitamin C 1000mg |
| 2     | `assets/images/1.webp` | Bepanthen skin care      |
| 3     | `assets/images/5.webp` | Doliprane paracetamol    |
| 4     | `assets/images/2.webp` | Bisolvon cough syrup     |
| 5     | `assets/images/4.webp` | Nasacort nasal spray     |

### Structure

- Left/right arrow buttons.
- Dot indicators at bottom center. Active dot: orange. Inactive: gray.
- Auto-advances every 5 seconds. Pauses on hover.
- No CTA button overlay needed -- the banner images already contain their own text/branding.

### Implementation

- Pure CSS + AngularJS `$interval` for auto-advance.
- `ng-style` or class toggle for slide transitions.
- No external carousel library (CDN-only constraint, keep it simple).

---

## 4. Quick Action Cards

Two cards in a row, directly under the hero. Matches the reference layout.

```
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  [illustration]                 │  │  [illustration]                 │
│  أضف الروشتة                    │  │  احفظ منتجاتك المفضلة            │
│  ارفع صورة الروشتة وسنساعدك    │  │  أضف المنتجات للمفضلة            │
│  في العثور على المنتجات         │  │  للرجوع إليها لاحقًا             │
│  [أضف صورة الروشتة]            │  │  [عرض المفضلة]                  │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

### Card 1: Prescription Upload (الروشتة)

- **Title:** أضف الروشتة
- **Sub:** ارفع صورة الروشتة وسنساعدك في العثور على المنتجات
- **CTA:** أضف صورة الروشتة
- **Behavior for MVP:** Opens a simple file input modal. No backend processing -- just UI demonstration. Store the image reference locally or show a success message.

### Card 2: Wishlist (المفضلة)

- **Title:** احفظ منتجاتك المفضلة
- **Sub:** أضف المنتجات للمفضلة للرجوع إليها لاحقًا
- **CTA:** عرض المفضلة
- **Behavior:** Navigates to wishlist view (could be a dedicated page or a section within `/orders` profile page).

### Card Styling

- White/light gray background (`#f5f5f5`).
- Subtle border or shadow.
- CTA buttons: outlined style, blue primary color. Not orange -- reserve orange for add-to-cart only.
- Equal width, responsive: stack vertically on mobile.

---

## 5-7. Product Shelves

Three shelves, each following the same pattern.

### Shelf Template

```
┌──────────────────────────────────────────────────────────────────────┐
│  [عرض الكل ←]                                    Section Title      │
│                                                                      │
│  ← [card] [card] [card] [card] [card] [card] →                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

- **Section title** on the right (RTL).
- **عرض الكل** link on the left. Links to `/shop?category=<value>`.
- Horizontal scrollable row of product cards.
- Left/right arrow buttons for scroll (optional for MVP -- CSS `overflow-x: auto` is sufficient).
- 6 cards visible on desktop. Scroll for more.

### Shelf 1: الأكثر طلبًا (Most Popular)

Curated mixed products -- hand-picked IDs from different categories to showcase variety.

Suggested selection (a mix of recognizable brands and categories):

- 1 painkiller (e.g., Panadol or Brufen)
- 1 vitamin (e.g., Centrum or Redoxon)
- 1 skincare (e.g., La Roche Posay or Nivea sunscreen)
- 1 baby product (e.g., Bepanthen or Bebelac)
- 1 oral care (e.g., Sensodyne or Signal)
- 1 sugar substitute (e.g., Sweetal)

Query: `GET /rest/v1/products?id=in.(id1,id2,id3,...)`

Shelf link: `/shop` (no filter -- shows all).

### Shelf 2: الفيتامينات و المكملات (Vitamins & Supplements)

Query: `GET /rest/v1/products?category=cs.{"الفيتامينات و المكملات الغذائية"}&limit=12`

This uses the Supabase `cs` (contains) operator to filter the `category` text array.

Shelf link: `/shop?category=الفيتامينات و المكملات الغذائية`

---

## 7. Category Shortcuts Grid

Placed between the second and third product shelves to break up the repeating shelf pattern and give users a different way to browse -- by specific need rather than broad category.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          تسوق حسب احتياجك                           │
│                                                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │  icon  │  │  icon  │  │  icon  │  │  icon  │  │  icon  │        │
│  │مسكنات  │  │الكحة   │  │الحماية │  │غسول    │  │الحموضة │        │
│  │        │  │        │  │من الشمس│  │الوجه   │  │وسوء    │        │
│  │        │  │        │  │        │  │        │  │الهضم   │        │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘        │
│                                                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │  icon  │  │  icon  │  │  icon  │  │  icon  │  │  icon  │        │
│  │تقوية   │  │البرد و │  │الحفاضات│  │مستلزمات│  │معجون   │        │
│  │المناعة │  │السعال  │  │والكريمات│  │الحلاقة │  │الأسنان │        │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘        │
└──────────────────────────────────────────────────────────────────────┘
```

### Purpose

The nav bar uses top-level `type` values (الأدوية, العناية بالبشرة و الشعر, etc.) which are broad. This grid surfaces **subcategory-level** needs -- the actual `category` array values from the database. A user who knows they need a painkiller shouldn't have to go through الأدوية and then filter. This grid takes them straight to `/shop?category=مسكنات`.

### Categories to Display (10 items, 2 rows of 5)

Selected based on: real product count in the database, high shopping intent, and covering different `type` groups so the grid feels varied.

| Display label       | DB `category` value   | Lucide icon suggestion |
| ------------------- | --------------------- | ---------------------- |
| مسكنات              | `مسكنات`              | `pill`                 |
| الكحة               | `الكحة`               | `stethoscope`          |
| الحماية من الشمس    | `الحماية من الشمس`    | `sun`                  |
| غسول الوجه          | `غسول الوجه`          | `droplets`             |
| الحموضة وسوء الهضم  | `الحموضة وسوء الهضم`  | `flame`                |
| تقوية المناعة       | `تقوية المناعة`       | `shield-plus`          |
| البرد و السعال      | `البرد و السعال`      | `thermometer`          |
| الحفاضات و الكريمات | `الحفاضات و الكريمات` | `baby`                 |
| مستلزمات الحلاقة    | `مستلزمات الحلاقة`    | `scissors`             |
| معجون الأسنان       | `معجون الأسنان`       | `sparkles`             |

### Card Styling

- Each card: small square or rounded rectangle.
- Lucide icon centered above the Arabic label.
- Icon color: blue (`#0583f2`). Label: dark text (`#1f1f1f`).
- Background: white with subtle border or light shadow.
- Hover: light blue background tint or slight elevation.
- Grid: 5 columns on desktop, 3 columns on tablet, 2 columns on mobile.
- Section title `تسوق حسب احتياجك` centered above the grid.

### Behavior

- Each card links to `/shop?category=<category_value>`.
- No "عرض الكل" link needed -- the nav bar already provides full category access.

---

### Shelf 3: بديل للسكر (Sugar Substitutes)

Query: `GET /rest/v1/products?category=cs.{"بديل للسكر"}&limit=12`

Shelf link: `/shop?category=بديل للسكر`

---

## Product Card

Appears in all shelves. Must match reference structure.

```
┌──────────────────┐
│            [♡]   │   ← wishlist heart, top-left (RTL: top-right)
│                  │
│    [product      │
│     image]       │
│                  │
│  Product name    │   ← name_ar, max 2 lines, ellipsis overflow
│  brand | volume  │   ← smaller, muted text
│  XX جنيه         │   ← price, bold, blue (#0583f2)
│                  │
│  [أضف إلى العربة] │   ← orange button (#f99d1c)
└──────────────────┘
```

### Card Data Mapping

| Card element   | DB field                         |
| -------------- | -------------------------------- |
| Image          | `image_url`                      |
| Title          | `name_ar`                        |
| Brand / meta   | `brand` + `volume` or `amount`   |
| Price          | `price` (displayed as `XX جنيه`) |
| Wishlist state | Check `wishlist` table if authed |

### Card Rules

- Image box: fixed aspect ratio (square or 4:3). `object-fit: contain` on white/light background.
- Title: 2 lines max, CSS `line-clamp: 2`.
- Price: bold, blue (#0583f2). Always visible.
- CTA button: orange (#f99d1c), white text. Full card width.
- Heart icon: outline by default, filled + red/orange when in wishlist. Clicking requires auth -- redirect to `/login` if guest.
- Card clicks (on image/title) navigate to `/product/:id`.
- If `stock === 0`: gray out the card, disable the add-to-cart button, show `غير متوفر` instead.

---

## 9. Brand Strip

Near the bottom, before the footer.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [عرض الكل ←]                                     تصفح الماركات     │
│                                                                      │
│  ← [logo] [logo] [logo] [logo] [logo] [logo] →                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Brands to Display

Use brand logo tiles. For MVP, display the same brands visible in the reference (which also exist in your DB):

- AXE
- Beesline
- Pampers
- Vichy
- Garnier
- Nivea
- LA ROCHE POSAY
- Dove

**Logo image source:** For MVP, use text-in-a-box or the brands' publicly available logos. No need to create custom assets. A simple bordered box with the brand name in bold text works fine for a school project.

### Behavior

- Horizontal scrollable row.
- Each brand tile links to `/shop?brand=<brand_name>`.
- `عرض الكل` links to `/shop` (or a future brand listing page).

---

## 10. Footer

Simple and functional.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  خدمة العملاء     │  روابط سريعة      │  عن Medfinder              │
│  ─────────────    │  ──────────────    │  ────────────              │
│  اتصل بنا         │  الرئيسية          │  متجر إلكتروني            │
│  01XXXXXXXXX      │  المتجر            │  متخصص في المنتجات         │
│  info@medfinder   │  عن الموقع         │  الصيدلانية                │
│                   │  لوحة التحكم       │                            │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│  © 2026 Medfinder. جميع الحقوق محفوظة                               │
└──────────────────────────────────────────────────────────────────────┘
```

### Footer Rules

- **لوحة التحكم** link goes to `/admin`. Per project rules, admin link lives in the footer (no auto-redirect on login).
- 3-column layout on desktop. Stacks on mobile.
- Muted text color. Dark background (`#1f1f1f`) or stay with light theme -- dealer's choice.
- Copyright line at the bottom.

---

## Data Fetching Summary (Home Controller)

The home controller (`js/controllers/home.controller.js`) needs to make these Supabase REST calls on page load:

```
1. Curated shelf (الأكثر طلبًا):
   GET /rest/v1/products?id=in.(id1,id2,id3,...)&select=id,name_ar,price,brand,volume,amount,image_url,stock

2. Vitamins shelf:
   GET /rest/v1/products?category=cs.{"الفيتامينات و المكملات الغذائية"}&select=id,name_ar,price,brand,volume,amount,image_url,stock&limit=12

3. Sugar substitutes shelf:
   GET /rest/v1/products?category=cs.{"بديل للسكر"}&select=id,name_ar,price,brand,volume,amount,image_url,stock&limit=12

4. Wishlist check (if authenticated):
   GET /rest/v1/wishlist?user_id=eq.<user_id>&select=product_id
```

All calls use `$http` with the Supabase REST API. API key passed via `apikey` header. Auth token via `Authorization: Bearer <token>` header.

---

## What's Explicitly Out of Scope for MVP Home

- Separate top utility bar (merged into header)
- Smart help / chatbot section (deferred)
- Insurance card feature (doesn't exist)
- Recently viewed products (requires tracking infrastructure)
- Dynamic "best sellers" (requires order data)
- Seasonal campaigns (static banners are enough)
- Mobile responsive layout (later enhancement)
- Search functionality implementation (later -- input is visible but search page comes later)
