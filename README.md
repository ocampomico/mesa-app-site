# mesa-app-site

The public site at **https://mesamesa.app**: a landing page, the privacy policy, the support page, and the pages that email links open before they hand off to the app.

Plain static HTML, built by one Node script with no dependencies.

```sh
node build.mjs                      # build ./dist and list any [placeholders] left
node build.mjs --strict             # same, but fail if any remain (the deploy uses this)
python3 -m http.server -d dist 4000 # preview at http://localhost:4000
```

Needs Node 22 or newer.

## Pages

| Path | Source | What |
|---|---|---|
| `/` | `build.mjs` | Landing page. A screen with no screenshot in `static/shots/` is left off, along with its feature section. |
| `/privacy/` | `content/privacy.md` | The privacy policy. This is the source of truth for the policy. |
| `/support/` | `content/support.md` | Help, contact, and how to delete an account. |
| `/auth/confirm/` | `build.mjs` | Where the sign-up confirmation email lands. Opens the app. |
| `/auth/reset/` | `build.mjs` | Where the password reset email lands. Opens the app. |

`content/*.md` supports headings, paragraphs, lists, tables, links, bold and italic. Anything in `[square brackets]` that isn't a link counts as a placeholder.

## Email link pages

Email apps and browsers wrap links in their own redirects, which can't reliably open a custom app link like `mesa://`. So the app's emails point at `/auth/confirm/` and `/auth/reset/`, and those pages pass the one-time code on to the app with an "Open Mesa" button (automatically on a phone). Only the phone that started the request can finish the sign-in, so the pages never create a session themselves.

The pages forward only `code`, `error`, `error_code` and `error_description`, and ask search engines not to index them. If you rename these paths, change the matching URLs in the app and the redirect list in the auth provider settings.

## Layout

| Path | What |
|---|---|
| `build.mjs` | Layout, styles, landing page, email link pages, and a small Markdown converter. |
| `content/` | Privacy policy and support page. |
| `static/` | Logo, icons and screenshots, copied as they are. Screenshots should use a generic profile with no real names or emails. |
| `.github/workflows/pages.yml` | Builds with `--strict` and publishes to GitHub Pages on every push to `main`. |

## Publishing (GitHub Pages)

1. Repo → Settings → Pages → Source: **GitHub Actions**. The `Deploy site` workflow publishes on every push to `main`.
2. Settings → Pages → Custom domain: `mesamesa.app`, then tick **Enforce HTTPS** once the certificate is ready. `.app` domains only load over HTTPS.
3. DNS at the registrar, for the apex domain:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
   | CNAME | `www` | `<github-username>.github.io` |

   Check the addresses against GitHub's "Managing a custom domain" page before saving. That page is the authority.

Any static host works instead: build with `node build.mjs --strict` and serve `dist/`.

## When the policy changes

Edit `content/privacy.md`, update its effective date, and push. If the change is about what the app collects or shares, update the App Privacy answers in App Store Connect too.

## Contact

support@mesamesa.app

## License

All rights reserved. See [LICENSE](LICENSE).
