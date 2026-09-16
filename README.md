# Escavello

Static, English-language multi-page finance site: one homepage, 50 articles, and two legal pages. HTML files are the content source; there is no React app or backend in this checkout.

## Development

Use Node.js 20.19+ in the Node 20 line, or Node.js 22.12+ (including Node 24).

```sh
cd site
npm install
npm run dev
npm run check
npm test
npm run build
npm run preview
```

Deploy the contents of `site/dist` at the domain root using a static host. Keep the existing `.html` article URLs and serve `/` as `index.html`. This is a multi-page site, so no single-page fallback rewrite is needed. No deployment provider configuration or environment files were present.

`npm run build` validates source references, builds every HTML route, and validates the output. `npm test` verifies ad configuration and checks unavailable-provider behavior.

## Structure

- `site/index.html`, `site/debt/`, `site/privacy.html`, `site/terms.html`: public pages and unchanged article routes.
- `site/assets/images/`: shared icons/logo and article images, deduplicated by content.
- `site/assets/styles/`: six shared stylesheets.
- `site/assets/scripts/ads.js`: recovered Google Publisher Tag initialization; IDs and sizes match the original captures.
- `site/scripts/`: source/output reference validation, focused ad tests, and optional browser validation.

## Known limitations

The original custom menu/search JavaScript is absent. Search submission and mobile menu/search toggles were already nonfunctional; recovering their original implementation requires the missing source. The source server returned HTTP 403 when retrieval was attempted.

There is no Reward flow, Hindi/Arabic content, or domain/language configuration in this checkout. Do not infer these from the generic cleanup checklist. The current English page language remains unchanged.

Existing tablet-width overflow is documented and was left unchanged under the no-redesign constraint. Google SDK initialization is verified, but actual ad inventory/fill and production-domain monetization must be checked in the real publisher environment.
