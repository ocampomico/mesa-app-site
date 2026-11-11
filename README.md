# mesa-app-site

The public site at **https://mesamesa.app**: a landing page, the privacy policy and the support page. The App Store listing and the app both link here (`/privacy/` and `/support/`).

Plain static HTML, built by one Node script with no dependencies.

```sh
node build.mjs                      # builds ./dist and lists any [placeholders] left
python3 -m http.server -d dist 4000 # preview at http://localhost:4000
```

| Path | What |
|---|---|
| `content/privacy.md` | The privacy policy. This is the source of truth; the app's `docs/privacy-policy.md` points here. |
| `content/support.md` | Help, contact, and how to delete an account (Apple and Google both ask for this on the web). |
| `build.mjs` | Layout, landing page, and a small Markdown converter (headings, paragraphs, lists, tables, links, bold, italic). |
| `static/` | Logo and icons, copied as they are. |

## Before it goes live

1. **Fill in the `[placeholders]`** in `content/privacy.md`: the effective date, who operates Mesa, how long server logs are kept, and Anthropic's data retention terms. `node build.mjs --strict` fails until they're gone, and the deploy uses `--strict`.
2. **Make `support@mesamesa.app` a real inbox.** Both pages and the App Store listing give it as the contact. Email forwarding at the domain registrar is enough.
3. **Have the policy reviewed.** It was written to match what the app and backend do, but it isn't legal advice.

## Publish (GitHub Pages)

1. Create the GitHub repo `mesa-app-site` (public, or private on a paid plan) and push `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**. The `Deploy site` workflow publishes on every push to `main`.
3. Settings → Pages → Custom domain: `mesamesa.app`, then tick **Enforce HTTPS** once the certificate is ready. `.app` domains only load over HTTPS.
4. DNS at the registrar, for the apex domain:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
   | CNAME | `www` | `<your-github-username>.github.io` |

   Check the addresses against GitHub's "Managing a custom domain" page before saving; they rarely change, but that page is the authority.

Any static host works instead (Cloudflare Pages, Netlify, S3 + CloudFront): build with `node build.mjs --strict` and serve `dist/`.

## When the policy changes

Edit `content/privacy.md`, update its effective date, and push. If the change is about what the app collects or shares, update the App Privacy answers in App Store Connect too (`mesa-app-ui/docs/app-store.md`).
