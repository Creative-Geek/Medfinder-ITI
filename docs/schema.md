# Medfinder Database Schema

Supabase project: `jwyylcesbwextxdmquuh` | Region: eu-central-1 (Frankfurt)

## Tables

### products

Public product catalog. RLS enabled. 149 rows seeded.

| Column            | Type        | Nullable | Default        | Notes                       |
| ----------------- | ----------- | -------- | -------------- | --------------------------- |
| id                | integer     | no       | auto-increment | PK                          |
| name_ar           | text        | no       |                | Arabic product name         |
| name_en           | text        | no       |                | English product name        |
| description       | text        | yes      |                | Product description         |
| price             | numeric     | no       |                | Price in EGP                |
| volume            | text        | yes      |                | e.g. "200 ml"               |
| amount            | text        | yes      |                | e.g. "16 TAB"               |
| type              | text        | no       |                | "medicine" or "cosmetic"    |
| brand             | text        | yes      |                | e.g. "Pharco", "Nivea"      |
| manufacturer      | text        | yes      |                | e.g. "L'Oreal", "GSK"       |
| stock             | integer     | no       | 100            | Available quantity          |
| image_url         | text        | yes      |                | Primary image URL           |
| images            | text[]      | yes      | '{}'           | Additional image URLs       |
| use_cases         | text[]      | yes      | '{}'           | Product use cases (Arabic)  |
| active_ingredient | text[]      | yes      | '{}'           | Active ingredients          |
| side_effects      | text[]      | yes      | '{}'           | Side effects (Arabic)       |
| category          | text[]      | yes      | '{}'           | Category tags (Arabic)      |
| usage             | text[]      | yes      | '{}'           | Usage instructions (Arabic) |
| warning           | text[]      | yes      | '{}'           | Warnings (Arabic)           |
| created_at        | timestamptz | no       | now()          |                             |

### profiles

User profiles, auto-created on signup via `handle_new_user` trigger.

| Column     | Type        | Nullable | Default | Notes                   |
| ---------- | ----------- | -------- | ------- | ----------------------- |
| id         | uuid        | no       |         | PK, FK -> auth.users.id |
| email      | text        | yes      |         |                         |
| full_name  | text        | yes      |         |                         |
| phone      | text        | yes      |         |                         |
| address    | text        | yes      |         |                         |
| created_at | timestamptz | no       | now()   |                         |

### orders

| Column           | Type        | Nullable | Default        | Notes                                             |
| ---------------- | ----------- | -------- | -------------- | ------------------------------------------------- |
| id               | integer     | no       | auto-increment | PK                                                |
| user_id          | uuid        | no       |                | FK -> profiles.id                                 |
| status           | text        | no       | 'pending'      | pending, confirmed, shipped, delivered, cancelled |
| total            | numeric     | no       |                | Order total in EGP                                |
| shipping_address | text        | yes      |                |                                                   |
| created_at       | timestamptz | no       | now()          |                                                   |

### order_items

| Column     | Type    | Nullable | Default        | Notes                     |
| ---------- | ------- | -------- | -------------- | ------------------------- |
| id         | integer | no       | auto-increment | PK                        |
| order_id   | integer | no       |                | FK -> orders.id           |
| product_id | integer | no       |                | FK -> products.id         |
| quantity   | integer | no       |                | CHECK > 0                 |
| unit_price | numeric | no       |                | Price at time of purchase |

### reviews

One review per user per product (unique constraint on product_id + user_id).

| Column     | Type        | Nullable | Default        | Notes             |
| ---------- | ----------- | -------- | -------------- | ----------------- |
| id         | integer     | no       | auto-increment | PK                |
| product_id | integer     | no       |                | FK -> products.id |
| user_id    | uuid        | no       |                | FK -> profiles.id |
| rating     | integer     | no       |                | CHECK 1-5         |
| comment    | text        | yes      |                |                   |
| created_at | timestamptz | no       | now()          |                   |

### wishlist

One entry per user per product (unique constraint on user_id + product_id). Cascade deletes on both FKs.

| Column     | Type        | Nullable | Default        | Notes             |
| ---------- | ----------- | -------- | -------------- | ----------------- |
| id         | integer     | no       | auto-increment | PK                |
| user_id    | uuid        | no       |                | FK -> profiles.id |
| product_id | integer     | no       |                | FK -> products.id |
| created_at | timestamptz | no       | now()          |                   |

### chat_sessions

| Column     | Type        | Nullable | Default           | Notes               |
| ---------- | ----------- | -------- | ----------------- | ------------------- |
| id         | uuid        | no       | gen_random_uuid() | PK                  |
| user_id    | uuid        | no       |                   | FK -> auth.users.id |
| created_at | timestamptz | no       | now()             |                     |
| updated_at | timestamptz | no       | now()             |                     |

### chat_messages

| Column         | Type        | Nullable | Default           | Notes                            |
| -------------- | ----------- | -------- | ----------------- | -------------------------------- |
| id             | uuid        | no       | gen_random_uuid() | PK                               |
| session_id     | uuid        | no       |                   | FK -> chat_sessions.id           |
| role           | text        | no       |                   | CHECK: 'user' or 'assistant'     |
| content        | text        | no       |                   |                                  |
| products_shown | jsonb       | yes      |                   | Product IDs surfaced in response |
| created_at     | timestamptz | no       | now()             |                                  |

## Row-Level Security Policies

### products

| Policy                                  | Command | Roles         | Rule |
| --------------------------------------- | ------- | ------------- | ---- |
| Products are publicly readable          | SELECT  | public        | true |
| Authenticated users can insert products | INSERT  | authenticated | true |
| Authenticated users can update products | UPDATE  | authenticated | true |
| Authenticated users can delete products | DELETE  | authenticated | true |

### profiles

| Policy                       | Command | Roles         | Rule            |
| ---------------------------- | ------- | ------------- | --------------- |
| Users can view own profile   | SELECT  | authenticated | auth.uid() = id |
| Users can update own profile | UPDATE  | authenticated | auth.uid() = id |

### orders

| Policy                      | Command | Roles         | Rule                 |
| --------------------------- | ------- | ------------- | -------------------- |
| Users can view own orders   | SELECT  | authenticated | auth.uid() = user_id |
| Users can insert own orders | INSERT  | authenticated | auth.uid() = user_id |
| Users can update own orders | UPDATE  | authenticated | auth.uid() = user_id |

### order_items

| Policy                           | Command | Roles         | Rule            |
| -------------------------------- | ------- | ------------- | --------------- |
| Users can view own order items   | SELECT  | authenticated | via orders join |
| Users can insert own order items | INSERT  | authenticated | via orders join |

### reviews

| Policy                                     | Command | Roles         | Rule                 |
| ------------------------------------------ | ------- | ------------- | -------------------- |
| Reviews are publicly readable              | SELECT  | public        | true                 |
| Authenticated users can insert own reviews | INSERT  | authenticated | auth.uid() = user_id |
| Users can update own reviews               | UPDATE  | authenticated | auth.uid() = user_id |
| Users can delete own reviews               | DELETE  | authenticated | auth.uid() = user_id |

### wishlist

| Policy                             | Command | Roles         | Rule                 |
| ---------------------------------- | ------- | ------------- | -------------------- |
| Users can view own wishlist        | SELECT  | authenticated | auth.uid() = user_id |
| Users can add to own wishlist      | INSERT  | authenticated | auth.uid() = user_id |
| Users can remove from own wishlist | DELETE  | authenticated | auth.uid() = user_id |

### chat_sessions

| Policy                             | Command | Roles         | Rule                 |
| ---------------------------------- | ------- | ------------- | -------------------- |
| Users can view own chat sessions   | SELECT  | authenticated | auth.uid() = user_id |
| Users can insert own chat sessions | INSERT  | authenticated | auth.uid() = user_id |
| Users can update own chat sessions | UPDATE  | authenticated | auth.uid() = user_id |

### chat_messages

| Policy                             | Command | Roles         | Rule                   |
| ---------------------------------- | ------- | ------------- | ---------------------- |
| Users can view own chat messages   | SELECT  | authenticated | via chat_sessions join |
| Users can insert own chat messages | INSERT  | authenticated | via chat_sessions join |

## Indexes

| Table         | Index                           | Type           | Column(s)           |
| ------------- | ------------------------------- | -------------- | ------------------- |
| products      | idx_products_brand              | btree          | brand               |
| products      | idx_products_category           | GIN            | category            |
| products      | idx_products_name_ar            | btree          | name_ar             |
| products      | idx_products_name_en            | btree          | lower(name_en)      |
| products      | idx_products_type               | btree          | type                |
| orders        | idx_orders_user_id              | btree          | user_id             |
| orders        | idx_orders_status               | btree          | status              |
| orders        | idx_orders_created_at           | btree          | created_at DESC     |
| order_items   | idx_order_items_order_id        | btree          | order_id            |
| order_items   | idx_order_items_product_id      | btree          | product_id          |
| reviews       | idx_reviews_product_id          | btree          | product_id          |
| reviews       | idx_reviews_user_id             | btree          | user_id             |
| reviews       | reviews_product_id_user_id_key  | btree (unique) | product_id, user_id |
| wishlist      | idx_wishlist_user_id            | btree          | user_id             |
| wishlist      | idx_wishlist_product_id         | btree          | product_id          |
| wishlist      | wishlist_user_id_product_id_key | btree (unique) | user_id, product_id |
| chat_sessions | idx_chat_sessions_user_id       | btree          | user_id             |
| chat_messages | idx_chat_messages_session_id    | btree          | session_id          |

## Functions

| Name             | Type                | Description                                                       |
| ---------------- | ------------------- | ----------------------------------------------------------------- |
| handle_new_user  | trigger             | Auto-creates a profiles row when a new auth.users row is inserted |
| check_rate_limit | function -> boolean | Rate-limiting helper for chat/API abuse prevention                |

## Relationships

```
auth.users 1--1 profiles
profiles   1--* orders
profiles   1--* reviews
profiles   1--* wishlist
orders     1--* order_items
products   1--* order_items
products   1--* reviews
products   1--* wishlist
auth.users 1--* chat_sessions
chat_sessions 1--* chat_messages
```
