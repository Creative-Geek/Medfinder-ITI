# Product Description Generation Tracker

## Goal

Improve the product detail page by replacing weak or inconsistent product descriptions with clearer, richer copy.

## Scope

- Data source: Supabase MCP
- Project: `Medfinder` (`jwyylcesbwextxdmquuh`)
- Table: `public.products`
- Primary field involved: `description`
- New rich description field: `long_description`

## Live Database Snapshot

Last checked: **2026-03-07**

| Metric                                                          | Count |
| --------------------------------------------------------------- | ----: |
| Total products                                                  |   149 |
| Products with a non-empty `description`                         |   149 |
| Products with short descriptions (`length(description) < 80`)   |    59 |
| Products with longer descriptions (`length(description) >= 80`) |    90 |
| Products with non-empty `long_description`                      |   149 |
| Products remaining without `long_description`                   |     0 |
| Products rewritten/generated in this initiative                 |   149 |

## What We're Doing

1. Audit the existing `description` values in `public.products`.
2. Identify products whose current descriptions feel too short, too generic, or inconsistent.
3. Generate stronger product descriptions for the product page.
4. Process products in batches of **30** at a time.
5. Track progress here until we add a dedicated database flag for generated descriptions.

## Tracking Rule

Right now, the database has only one `description` column, so it does **not** distinguish between:

- original seeded descriptions,
- manually edited descriptions,
- AI-generated/rewritten descriptions.

Because of that, this markdown file is the temporary source of truth for **how many descriptions we have generated in this rewrite effort**.

The new field for richer product-page copy is: **`long_description`**.

## Progress Log

| Date       | Update                                                                          | Generated/Rewritten Total |
| ---------- | ------------------------------------------------------------------------------- | ------------------------: |
| 2026-03-07 | Batch 6 completed: generated Arabic `long_description` for product IDs 131-149. |                       149 |
| 2026-03-07 | Batch 5 completed: generated Arabic `long_description` for product IDs 101-130. |                       130 |
| 2026-03-07 | Batch 4 completed: generated Arabic `long_description` for product IDs 71-100.  |                       100 |
| 2026-03-07 | Batch 3 completed: generated Arabic `long_description` for product IDs 41-70.   |                        70 |
| 2026-03-07 | Batch 2 completed: generated Arabic `long_description` for product IDs 11-40.   |                        40 |
| 2026-03-07 | Increased generation batch size from 10 to 30 for the next batches.             |                        10 |
| 2026-03-07 | Batch 1 completed: generated Arabic `long_description` for product IDs 1-10.    |                        10 |
| 2026-03-07 | Chosen new rich description column: `long_description`.                         |                         0 |
| 2026-03-07 | Created tracker and captured baseline from the live database.                   |                         0 |

## Notes

- Some products already have detailed descriptions, while others still look like placeholders or very short labels.
- If we want this count to be queryable directly from the database later, we should add a field like `description_generated_at`, `description_version`, or `description_source`.
