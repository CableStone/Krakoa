# Lyons of Judah — Shopify theme

This is an Online Store 2.0 Shopify theme built from scratch (not a Dawn fork)
to reproduce the static `Home/Shop/About/Contact/Product.html` prototype at
the repo root, with real Shopify data, cart, and checkout wired in.

## Requirements

- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) (`npm install -g @shopify/cli` or `brew install shopify-cli`)
- A Shopify store to develop against — a free [dev store](https://shopify.dev/docs/apps/build/scaffold-theme-app-extension#create-a-development-store) from a Partner account works, or any store you have staff access to.

## Preview locally

```sh
cd shopify-theme
shopify theme dev --store your-store.myshopify.com
```

This prints a local preview URL and hot-reloads on save. Nothing is
pushed to the live theme — `theme dev` runs against a preview session.

## Push to a theme on your store (as a draft, non-live)

```sh
shopify theme push --unpublished --store your-store.myshopify.com
```

Drop `--unpublished` (and add `--live` if you're sure) only when you want
it to go live immediately — otherwise install it as a new theme in
Online Store → Themes and preview/publish from there.

## One-time setup in Shopify admin

The theme expects the following to exist. None of it is created
automatically — Shopify doesn't let a theme provision store data.

1. **Products & variants.** Create products with a `Size` option (values
   like `XS/S/M/L`) if you want the size picker on the product page — a
   product without a `Size` option just skips the size row and adds the
   default variant straight to the bag.
2. **Product tags for the Shop-page filters.** The Shop page's filter row
   (`All / Choshen Collection / Tzadik Him / Tees / Knitwear / Outerwear`)
   is driven by product tags, not real Shopify collections, so a product
   can appear under multiple filters. Tag products with (lowercase, exact):
   `choshen`, `tzadik`, `tees`, `knitwear`, `outerwear`. Edit or add filter
   buttons via the **Collection grid** section's blocks in the theme editor.
3. **Collections** for the category tiles on the homepage (Choshen, Tzadik
   Him) and for the "Shop" nav/breadcrumb link — point the **Shop** menu
   entry and the collection-grid template at whichever collection you want
   as "Shop All" (Shopify's automatic `all` collection is the simplest
   choice: `/collections/all`).
4. **Pages.** Create a Page with handle `about` using template suffix
   `page.about`, and a Page with handle `contact` using template suffix
   `page.contact` (Admin → Online Store → Pages → set "Theme template" in
   the page's sidebar).
5. **Navigation menus.** The header reads the `main-menu` link list and the
   footer reads the `footer` link list (Admin → Online Store →
   Navigation) — add Choshen / Tzadik Him / Shop / Atelier / Contact links
   to `main-menu`, matching the original design's nav.
6. **Contact form submissions** land in Admin → Inbox (or your
   notification email) automatically — that's Shopify's native `{% form
   'contact' %}`, no app required.
7. **Newsletter signups** use Shopify's native customer form
   (`contact[tags]=newsletter`) — subscribers show up as customers tagged
   `newsletter` in Admin → Customers, which you can use as a segment for
   whatever email tool you connect (Shopify Email, Klaviyo, etc.).

## What's real vs. what the static prototype faked

| Static prototype (`/Home.html` etc.) | This theme |
|---|---|
| Hardcoded product data | Real `product` objects — price, availability, images, variants |
| `localStorage` bag counter | Real Shopify cart via the Ajax Cart API (`/cart/add.js`, `/cart/change.js`) — persists server-side, survives across devices, and can reach an actual checkout |
| Fake "Thank you" on form submit | Shopify's native `{% form 'contact' %}` / customer form — real submissions, real emails |
| "You May Also Like" hardcoded to 4 fixed products | Shopify's Product Recommendations API (`routes.product_recommendations_url`), fetched client-side |
| Styled placeholder tiles everywhere | Same placeholder tiles, but now a **fallback** — every image slot renders real product/section imagery the moment you assign it in the admin or theme editor, and reverts to the placeholder when empty |

## Design tokens

Colors (indigo/cream/panel) and page width are editable in the theme
editor under **Theme settings**. Cormorant Garamond and Work Sans are
loaded directly via Google Fonts `<link>` tags in `layout/theme.liquid`
rather than through Shopify's `font_picker` setting, because neither
font is in Shopify's own font library — `font_picker` can only select
from Shopify-hosted fonts, not arbitrary Google Fonts. This does mean a
`theme check` run flags those `<link>` tags with a `RemoteAsset`
warning; that's expected and left as-is.

## QA notes

- Ran `shopify theme check` (via `npx @shopify/cli theme check`) clean:
  **0 errors**, only 2 expected warnings — the Google Fonts `RemoteAsset`
  warnings above, and a false-positive `OrphanedSnippet` warning on
  `snippets/split-media-text-copy.liquid` (it *is* rendered twice, from
  `sections/split-media-text.liquid` — confirmed by direct grep; the
  checker's static reference scan appears to miss it for reasons unrelated
  to correctness).
- All JSON templates/schemas validated as parseable; every `type`
  referenced in a template/section-group resolves to a real section file;
  every `{% render %}` call resolves to a real snippet file.
- Not yet tested against a live store/checkout (this session has no
  Shopify store credentials) — run through the full add-to-cart →
  checkout flow on your dev store before going live.
