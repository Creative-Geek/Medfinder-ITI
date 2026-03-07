# Login / Signup Page -- Agent Handoff

## Goal

Build the `/login` page: split-layout (illustration left, form right), toggle between login and signup modes, wire to existing `AuthService`, store session, redirect on success.

## Hard Rules

- **No npm/Node/bundlers** -- CDN only (AngularJS 1.x, Franken UI, Tailwind CDN, Lucide, Cairo font)
- **No Supabase JS client** -- `$http` via REST only (already handled by interceptors)
- **No social/OAuth** -- email + password only
- **No emojis** in UI or code
- RTL layout (`dir="rtl"`, `lang="ar"`)

## Files to Modify (all exist as placeholders)

| File                                 | Current State                     |
| ------------------------------------ | --------------------------------- |
| `views/login.html`                   | Placeholder "قريبا..."            |
| `js/controllers/login.controller.js` | Stub with `$scope.pageTitle` only |
| `css/pages/login.css`                | Empty file with comment header    |

All three are already loaded in `index.html` (script tags + CSS link). Route `/login` is already wired in `js/config/routes.js` with `access: "guest"`.

## Design Spec

### Layout

- **Split 2-column layout** on desktop (50/50)
  - **Left column**: Decorative illustration or branded visual (use a gradient/pattern with the Medfinder logo if no illustration is available -- do NOT use a placeholder image)
  - **Right column**: The form card
- On mobile: form only, full width (hide illustration)

### Form

- **Toggle** between Login and Signup mode (link at bottom: "ليس لديك حساب؟ سجل الان" / "لديك حساب؟ سجل دخول")
- **Login fields**: email, password
- **Signup fields**: full name, email, password, confirm password
- **Password show/hide toggle** (eye icon via Lucide `eye` / `eye-off`)
- **Submit button**: accent color (`#f99d1c`), full width
- **Error messages**: inline below form (red text)
- **Loading state**: spinner or disabled button while request is in flight

### Behavior

- On successful login: store token (already handled by `AuthService.login()`), redirect to `/` (or previous page if available)
- On successful signup: auto-login or show success message
- If already logged in and visits `/login`: redirect to `/`
- Form validation: required fields, email format, password min length, confirm password match

## Existing Services (DO NOT modify these)

### AuthService (`js/services/auth.service.js`)

```javascript
AuthService.signup(email, password, fullName); // POST /auth/v1/signup
AuthService.login(email, password); // POST /auth/v1/token?grant_type=password
// Auto-stores: sb_access_token, sb_refresh_token, sb_user
AuthService.logout(); // Clears session
AuthService.getCurrentUser(); // Returns parsed user from sessionStorage
AuthService.isLoggedIn(); // Returns boolean
AuthService.getToken(); // Returns access token string
```

### Session Keys

| Key                | Value                                                |
| ------------------ | ---------------------------------------------------- |
| `sb_access_token`  | JWT access token                                     |
| `sb_refresh_token` | Refresh token                                        |
| `sb_user`          | JSON stringified user object                         |
| `sb_user_role`     | `"admin"` or `"user"` (needs to be set during login) |

### Admin Detection

The admin email is `ahmedtaha1234@gmail.com`. During login, check the user's email and set `sb_user_role`:

```javascript
var role = res.data.user.email === "ahmedtaha1234@gmail.com" ? "admin" : "user";
sessionStorage.setItem("sb_user_role", role);
```

### HTTP Interceptor (`js/config/interceptors.js`)

Already injects `apikey` and `Authorization: Bearer <token>` on all Supabase requests. No manual header management needed.

### Route Guard (`js/app.js`)

Already checks `sb_access_token` and `sb_user_role` on `$routeChangeStart`. Routes with `access: "user"` redirect to `/login` if no token. Routes with `access: "admin"` redirect to `/` if not admin.

## Design Tokens

| Token         | Value                                   |
| ------------- | --------------------------------------- |
| Font          | Cairo (Google Fonts, already loaded)    |
| Primary       | `#0583f2`                               |
| Accent        | `#f99d1c`                               |
| Dark          | `#1f1f1f`                               |
| BG Card       | `#f5f5f5`                               |
| BG Page       | `#fdfdff`                               |
| Danger        | `#e74c3c`                               |
| Border radius | `--radius-md: 8px`, `--radius-lg: 12px` |

## Available CSS Components (in `css/components.css`)

- `.btn`, `.btn--primary`, `.btn--accent`, `.btn--lg`, `.btn--block`
- `.form-input`, `.form-label`, `.form-group`
- `.badge`, `.badge--danger`

## Lucide Icons

Use `data-lucide` attribute on `<i>` tags. Lucide auto-initializes on `$viewContentLoaded` (see `app.js`). For icons rendered after async operations, call:

```javascript
$timeout(function () {
  lucide.createIcons();
}, 50);
```

Useful icons: `mail`, `lock`, `eye`, `eye-off`, `user`, `log-in`, `loader`

## Profiles Table

On signup, a row should be created in the `profiles` table. Check if there's a trigger or do it manually:

```
POST /rest/v1/profiles
{
  "id": "<user_uuid_from_signup_response>",
  "email": "<email>",
  "full_name": "<full_name>"
}
```

The `profiles` table schema:
| Column | Type |
|--------|------|
| id | uuid (matches auth.users.id) |
| email | text |
| full_name | text |
| phone | text (nullable) |
| address | text (nullable) |
| created_at | timestamptz |
