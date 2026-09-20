# Putting the site on your own domain

The site is live at `https://matteoblandino2004.github.io/LoveMatch/`. Pointing your own domain at
it takes about five minutes plus DNS propagation, and it stays free — GitHub Pages doesn't charge
for custom domains or the certificate.

## 1. Buy a domain

Anywhere is fine. Cloudflare sells at cost (~$10/yr, no upsells) and is the easiest to configure;
Namecheap and Porkbun are also fine. GoDaddy works but buries the DNS settings.

Names worth checking: `wingman.app` (premium, likely expensive), `getwingman.com`,
`wingmanapp.io`, `bethewingman.com`, `wingman.dating`.

## 2. Tell GitHub about it

Create a file called **`CNAME`** in the `docs/` folder of this repo, containing nothing but your
domain:

```
getwingman.com
```

Commit and push. The deploy workflow copies it into the site automatically. (Or use the repo's
Settings → Pages → Custom domain box, which creates the same file.)

## 3. Point the DNS at GitHub

In your registrar's DNS settings, add these **four A records** for the apex domain, plus one CNAME
for `www`:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `matteoblandino2004.github.io.` |

If you'd rather use a subdomain only (`app.yourdomain.com`), skip the A records and add a single
CNAME from `app` to `matteoblandino2004.github.io.`

DNS takes anywhere from two minutes to a few hours. Check progress with
[dnschecker.org](https://dnschecker.org).

## 4. Turn on HTTPS

Repo → **Settings → Pages**. Once the domain verifies, tick **Enforce HTTPS**. The certificate is
issued automatically; if the tick box is greyed out, DNS hasn't finished propagating — wait and
come back.

## 5. Update the two URLs Apple has

If you've already submitted to App Store Connect, change the Privacy Policy URL and Support URL to
the new domain (`https://getwingman.com/privacy.html` and `/support.html`). The old GitHub URLs keep
working, so nothing breaks in the meantime.
