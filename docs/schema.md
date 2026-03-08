# Database Schema

This file reflects the database schema in Supabase for the Medfinder project.

## `public.products`

| Column              | Type                       | Nullable | Default                                | Checks / Constraints |
| ------------------- | -------------------------- | -------- | -------------------------------------- | -------------------- |
| `id`                | `integer`                  | No       | `nextval('products_id_seq'::regclass)` | Primary Key          |
| `name_ar`           | `text`                     | No       |                                        |                      |
| `name_en`           | `text`                     | No       |                                        |                      |
| `description`       | `text`                     | Yes      |                                        |                      |
| `price`             | `numeric`                  | No       |                                        |                      |
| `volume`            | `text`                     | Yes      |                                        |                      |
| `amount`            | `text`                     | Yes      |                                        |                      |
| `type`              | `text`                     | No       |                                        |                      |
| `brand`             | `text`                     | Yes      |                                        |                      |
| `manufacturer`      | `text`                     | Yes      |                                        |                      |
| `stock`             | `integer`                  | No       | `100`                                  |                      |
| `image_url`         | `text`                     | Yes      |                                        |                      |
| `images`            | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `use_cases`         | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `active_ingredient` | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `side_effects`      | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `category`          | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `usage`             | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `warning`           | `ARRAY`                    | Yes      | `'{}'::text[]`                         |                      |
| `created_at`        | `timestamp with time zone` | No       | `now()`                                |                      |
| `long_description`  | `text`                     | Yes      |                                        |                      |

## `public.profiles`

| Column       | Type                       | Nullable | Default | Checks / Constraints |
| ------------ | -------------------------- | -------- | ------- | -------------------- |
| `id`         | `uuid`                     | No       |         | Primary Key          |
| `email`      | `text`                     | Yes      |         |                      |
| `full_name`  | `text`                     | Yes      |         |                      |
| `phone`      | `text`                     | Yes      |         |                      |
| `address`    | `text`                     | Yes      |         |                      |
| `created_at` | `timestamp with time zone` | No       | `now()` |                      |

## `public.orders`

| Column             | Type                       | Nullable | Default                              | Checks / Constraints         |
| ------------------ | -------------------------- | -------- | ------------------------------------ | ---------------------------- |
| `id`               | `integer`                  | No       | `nextval('orders_id_seq'::regclass)` | Primary Key                  |
| `user_id`          | `uuid`                     | No       |                                      | Foreign Key to `profiles.id` |
| `status`           | `text`                     | No       | `'pending'::text`                    |                              |
| `total`            | `numeric`                  | No       |                                      |                              |
| `shipping_address` | `text`                     | Yes      |                                      |                              |
| `created_at`       | `timestamp with time zone` | No       | `now()`                              |                              |

## `public.order_items`

| Column       | Type      | Nullable | Default                                   | Checks / Constraints         |
| ------------ | --------- | -------- | ----------------------------------------- | ---------------------------- |
| `id`         | `integer` | No       | `nextval('order_items_id_seq'::regclass)` | Primary Key                  |
| `order_id`   | `integer` | No       |                                           | Foreign Key to `orders.id`   |
| `product_id` | `integer` | No       |                                           | Foreign Key to `products.id` |
| `quantity`   | `integer` | No       |                                           | `quantity > 0`               |
| `unit_price` | `numeric` | No       |                                           |                              |

## `public.reviews`

| Column          | Type                       | Nullable | Default                               | Checks / Constraints          |
| --------------- | -------------------------- | -------- | ------------------------------------- | ----------------------------- |
| `id`            | `integer`                  | No       | `nextval('reviews_id_seq'::regclass)` | Primary Key                   |
| `product_id`    | `integer`                  | No       |                                       | Foreign Key to `products.id`  |
| `rating`        | `integer`                  | No       |                                       | `rating >= 1 AND rating <= 5` |
| `review_text`   | `text`                     | Yes      |                                       |                               |
| `created_at`    | `timestamp with time zone` | No       | `now()`                               |                               |
| `reviewer_name` | `text`                     | No       |                                       |                               |

## `public.chat_sessions`

| Column       | Type                       | Nullable | Default             | Checks / Constraints           |
| ------------ | -------------------------- | -------- | ------------------- | ------------------------------ |
| `id`         | `uuid`                     | No       | `gen_random_uuid()` | Primary Key                    |
| `user_id`    | `uuid`                     | No       |                     | Foreign Key to `auth.users.id` |
| `created_at` | `timestamp with time zone` | No       | `now()`             |                                |
| `updated_at` | `timestamp with time zone` | No       | `now()`             |                                |

## `public.chat_messages`

| Column           | Type                       | Nullable | Default             | Checks / Constraints                                  |
| ---------------- | -------------------------- | -------- | ------------------- | ----------------------------------------------------- |
| `id`             | `uuid`                     | No       | `gen_random_uuid()` | Primary Key                                           |
| `session_id`     | `uuid`                     | No       |                     | Foreign Key to `chat_sessions.id`                     |
| `role`           | `text`                     | No       |                     | `role = ANY (ARRAY['user'::text, 'assistant'::text])` |
| `content`        | `text`                     | No       |                     |                                                       |
| `products_shown` | `jsonb`                    | Yes      |                     |                                                       |
| `created_at`     | `timestamp with time zone` | No       | `now()`             |                                                       |

## `public.wishlist`

| Column       | Type                       | Nullable | Default      | Checks / Constraints         |
| ------------ | -------------------------- | -------- | ------------ | ---------------------------- |
| `id`         | `integer`                  | No       | `BY DEFAULT` | Primary Key                  |
| `user_id`    | `uuid`                     | No       |              | Foreign Key to `profiles.id` |
| `product_id` | `integer`                  | No       |              | Foreign Key to `products.id` |
| `created_at` | `timestamp with time zone` | No       | `now()`      |                              |

## `public.wishlists`

| Column       | Type                       | Nullable | Default  | Checks / Constraints           |
| ------------ | -------------------------- | -------- | -------- | ------------------------------ |
| `id`         | `bigint`                   | No       | `ALWAYS` | Primary Key                    |
| `user_id`    | `uuid`                     | No       |          | Foreign Key to `auth.users.id` |
| `product_id` | `bigint`                   | No       |          | Foreign Key to `products.id`   |
| `created_at` | `timestamp with time zone` | No       | `now()`  |                                |
