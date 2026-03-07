## Franken UI Imports

```html
<!-- Franken UI CSS -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/franken-ui@2.0.0/dist/css/core.min.css"
/>
<!-- Tailwind Play CDN -->
<script>
  /* Suppress Tailwind CDN dev-mode warning */
  const _tw_warn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("cdn.tailwindcss.com"))
      return;
    _tw_warn.apply(console, args);
  };
</script>
<script src="https://cdn.tailwindcss.com"></script>
```

## Lucide Icons Imports

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/lucide@latest/dist/umd/lucide.min.css"
/>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

## AngularJS Imports

```html
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.3/angular-route.min.js"></script>
```
