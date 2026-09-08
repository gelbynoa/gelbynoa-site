#!/usr/bin/env python3
"""Build self-contained (zero external request) HTML snapshots of each page
for Claude Design cards. Inlines fonts (base64 @font-face), styles.css and
script.js; strips all external links; stamps the @dsCard marker."""
import re, base64, urllib.request, pathlib, sys

BASE = pathlib.Path("/Users/noadavidovich/gelbynoa")
OUT = BASE / "_design"
OUT.mkdir(exist_ok=True)
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

FONT_URL = ("https://fonts.googleapis.com/css2?"
            "family=Frank+Ruhl+Libre:ital,wght@0,300;0,400;0,500;1,400"
            "&family=Assistant:wght@200;300;400;500&display=swap")

def fetch(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()

# 1) Pull the font CSS (woff2 subsets w/ unicode-range) and inline every woff2 as base64
print("Downloading font CSS…")
css = fetch(FONT_URL).decode("utf-8")
urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", css)))
print(f"  {len(urls)} woff2 files to inline")
cache = {}
for i, u in enumerate(urls, 1):
    data = fetch(u)
    cache[u] = base64.b64encode(data).decode("ascii")
    print(f"  [{i}/{len(urls)}] {len(data)//1024} KB  {u.split('/')[-1]}")
fonts_css = re.sub(
    r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)",
    lambda m: f"url(data:font/woff2;base64,{cache[m.group(1)]})",
    css)

# 2) Read shared assets
styles = (BASE / "styles.css").read_text(encoding="utf-8")
script = (BASE / "script.js").read_text(encoding="utf-8")

PAGES = ["index", "about", "courses", "course", "results", "gallery", "faq", "contact"]

def transform(html):
    # drop preconnect + google fonts + external stylesheet links
    html = re.sub(r'\s*<link rel="preconnect"[^>]*>\n?', "\n", html)
    html = re.sub(r'\s*<link href="https://fonts\.googleapis\.com[^>]*>\n?', "\n", html)
    html = re.sub(r'\s*<link rel="stylesheet" href="styles\.css"[^>]*>\n?', "\n", html)
    # inline fonts + styles before </head>
    style_block = f"<style>\n/* --- inlined fonts --- */\n{fonts_css}\n/* --- design system --- */\n{styles}\n</style>"
    html = html.replace("</head>", style_block + "\n</head>", 1)
    # inline script
    html = html.replace('<script src="script.js"></script>',
                        f"<script>\n{script}\n</script>", 1)
    # marker MUST be the first line
    return '<!-- @dsCard group="Screens" -->\n' + html

for name in PAGES:
    src = (BASE / f"{name}.html").read_text(encoding="utf-8")
    out = transform(src)
    (OUT / f"{name}.html").write_text(out, encoding="utf-8")
    # sanity: no remaining external requests
    ext = re.findall(r'(?:href|src)="https?://[^"]+"', out)
    ext = [e for e in ext if "gstatic" not in e and "googleapis" not in e]
    print(f"  wrote _design/{name}.html  ({len(out)//1024} KB)  external-refs-left: {len(ext)}")

print("DONE")
