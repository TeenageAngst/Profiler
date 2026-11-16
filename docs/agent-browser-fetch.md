# Fetching FanFiction.net pages with a real browser (agent route)

FanFiction.net blocks plain curl with Cloudflare, and the cookie-file
workaround does not work here either: Cloudflare never challenges a
normal browser session, so no `cf_clearance` cookie is ever issued to
export. The fetch layer that works is a real browser driven by an
agent. This is a proof-of-concept setup and only the author uses it,
so the local setup being load-bearing is acceptable.

The Perl scrapers already support this split: the agent fetches pages
in a real browser and saves the raw HTML, and the script parses the
saved files instead of fetching. No change to the parsers is needed.

## Setup: Playwright MCP in Roo Code

Prerequisites: Node.js (for `npx`) and Chrome installed on the
Windows box. Roo Code is an MCP client; add the Playwright MCP
server to its MCP settings (`mcp_settings.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

How it works:

- The server drives a real browser (Chrome channel by default) and
  gives the agent tools like `browser_navigate`, `browser_snapshot`,
  and `browser_evaluate`.
- The profile is **persistent by default**: login state, cookies and
  local storage are kept between sessions, on Windows under
  `%LOCALAPPDATA%\ms-playwright-mcp\`. Log into FFN once in that
  browser and later sessions start logged in.
- To drive the Chrome you already use instead, the server also has a
  browser-extension mode that connects to your existing tabs over
  CDP, so the agent works in your real browser with your real
  session. See the Playwright MCP docs for the extension setup.

## Workflow: agent fetches, Perl script parses

For an author with FFN user id `<id>`:

1. Agent navigates to `https://www.fanfiction.net/u/<id>/` and
   saves the page HTML to `profile.html` (evaluate
   `document.documentElement.outerHTML` and write it to a file).
   Read the author's own story list off that page: the first own
   story is the most recent. Note its story id, chapter count, and
   slug.
2. Agent navigates to each chapter
   `https://www.fanfiction.net/s/<story_id>/<n>/<slug>` and saves the
   page HTML to `<n>.html` inside a folder, e.g. `chapters/`.
3. Run the parser on the saved files (no live fetch happens):

```powershell
perl scripts/scrape_ffn_latest.pl <id> --profile-file profile.html --chapter-dir chapters --delay 0
```

Output is the same as a live run: one text file per chapter plus
`00_meta.txt` and `full.txt` under `out/<author>/<story_id>-<slug>/`.

The same split works for AO3 while it is down, with
`scrape_ao3_latest.pl --works-file ... --work-file ...`, except AO3
needs only one saved work page because `?view_full_work=true` puts
all chapters on it.

## If the plain Playwright browser ever gets flagged

Swap the server for the Camoufox variant, which runs the same
Playwright MCP tool set on a patched Firefox built for
anti-fingerprinting:

```
uvx camoufox-playwright-mcp --headless
```

Same tools (`browser_navigate`, `browser_snapshot`, ...), same
workflow above. Camoufox also supports Roo Code as an MCP client.

## Why not curl-impersonate

curl-impersonate (a patched curl replaying a real browser's TLS
fingerprint) is the best option for keeping the fetch inside the
script, and it is the fallback if the agent route ever becomes
inconvenient. It was not chosen for now because it needs a separate
binary on Windows, its fingerprints drift as Chrome ships new
versions, and it cannot pass a JavaScript challenge if FFN ever
escalates to one. A real browser has none of those problems.
