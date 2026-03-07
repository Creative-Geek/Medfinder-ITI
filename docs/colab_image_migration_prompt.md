# Image Migration Task: PNG to WebP + Upload to Supabase Storage

## Goal

Download all product images from their current URLs (ibb.co PNGs), convert them to WebP format, upload them to the Supabase `product-images` storage bucket, then update the products table with the new URLs.

## What You Have

- A CSV export of the `products` table (uploaded in this session).
- A Python environment (Google Colab).
- No Supabase CLI or MCP -- use HTTP requests only.

## Supabase Credentials

| Key            | Value                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project URL    | `https://jwyylcesbwextxdmquuh.supabase.co`                                                                                                                                                                         |
| Anon Key       | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsY2VzYndleHR4ZG1xdXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjMzMTMsImV4cCI6MjA4ODM5OTMxM30.U8P5lN5MPbPFfYq82Vw5fFqySyTRPNsd1UgAcFyyHO8` |
| Admin Email    | `ahmedtaha1234@gmail.com`                                                                                                                                                                                          |
| Admin Password | `19731793`                                                                                                                                                                                                         |
| Storage Bucket | `product-images`                                                                                                                                                                                                   |

## Products Table Schema (relevant columns)

| Column      | Type    | Description                                   |
| ----------- | ------- | --------------------------------------------- |
| `id`        | integer | Product primary key                           |
| `image_url` | text    | Main product image URL (currently ibb.co PNG) |
| `images`    | text[]  | Array of additional image URLs (ibb.co PNGs)  |

### Sample data

```
id=125, image_url="https://i.ibb.co/CB7JBsY/image.png", images=["https://i.ibb.co/CB7JBsY/image.png","https://i.ibb.co/B4tBZBw/image.png","https://i.ibb.co/tDTdmD3/image.png","https://i.ibb.co/9tV5Yv8/image.png"]
id=136, image_url="https://i.ibb.co/2sqKwR6/image.png", images=["https://i.ibb.co/2sqKwR6/image.png"]
```

Note: `image_url` is always the first entry of `images`. Some products may share the same image URL.

## Step-by-Step Instructions

### 1. Install dependencies

```
pip install Pillow requests
```

### 2. Authenticate as admin

Sign in via the Supabase Auth REST API to get an access token:

```
POST https://jwyylcesbwextxdmquuh.supabase.co/auth/v1/token?grant_type=password
Headers:
  apikey: <anon_key>
  Content-Type: application/json
Body:
  {"email": "ahmedtaha1234@gmail.com", "password": "19731793"}
```

Extract `access_token` from the response. Use it in all subsequent requests as `Authorization: Bearer <access_token>`.

### 3. Load the CSV and collect all unique image URLs

- Read the CSV with pandas.
- Parse `image_url` (single string) and `images` (array stored as string -- parse it).
- Deduplicate all URLs across both columns. There are ~149 products and likely 200-400 unique images.

### 4. Download each image, convert to WebP, and upload

For each unique image URL:

1. **Download** the PNG via `requests.get(url)`.
2. **Convert** to WebP using Pillow:

   ```python
   from PIL import Image
   from io import BytesIO

   img = Image.open(BytesIO(response.content))
   webp_buffer = BytesIO()
   img.save(webp_buffer, format="WEBP", quality=80)
   webp_bytes = webp_buffer.getvalue()
   ```

3. **Generate a filename**: Use a naming scheme based on the URL hash or a sequential ID. Example: use the ibb.co short code as the filename, e.g. `CB7JBsY.webp` (extract from URL pattern `https://i.ibb.co/<CODE>/image.png`).
4. **Upload** to Supabase Storage:
   ```
   POST https://jwyylcesbwextxdmquuh.supabase.co/storage/v1/object/product-images/<filename>.webp
   Headers:
     apikey: <anon_key>
     Authorization: Bearer <access_token>
     Content-Type: image/webp
   Body: <raw webp bytes>
   ```
5. **Build a mapping** from old URL to new public URL:
   ```
   https://jwyylcesbwextxdmquuh.supabase.co/storage/v1/object/public/product-images/<filename>.webp
   ```

Add error handling and retries. Some ibb.co URLs may fail -- log those and continue. Print progress (e.g. `Uploaded 42/350`).

### 5. Update the products table

For each product, update both `image_url` and `images` with the new Supabase URLs using the REST API:

```
PATCH https://jwyylcesbwextxdmquuh.supabase.co/rest/v1/products?id=eq.<product_id>
Headers:
  apikey: <anon_key>
  Authorization: Bearer <access_token>
  Content-Type: application/json
  Prefer: return=minimal
Body:
  {
    "image_url": "<new_main_url>",
    "images": ["<new_url_1>", "<new_url_2>", ...]
  }
```

### 6. Verify

- Pick 5 random products and open their new `image_url` in the browser to confirm they load.
- Print a summary: total images processed, successes, failures.

## Important Notes

- The bucket is **public read** -- anyone can view images via the public URL, no auth needed for reading.
- Only the admin (authenticated) can upload/update/delete.
- The bucket only accepts: `image/webp`, `image/png`, `image/jpeg`. Max file size: 5 MB.
- Add a small delay between uploads (e.g. `time.sleep(0.1)`) to avoid rate limiting.
- If an image download fails from ibb.co, skip it and log the failure. Do NOT stop the whole process.
