# Giving the agent a browser

This is how you drive a page in the app, and ask it questions.

It uses [agent-browser](https://github.com/vercel-labs/agent-browser), a CLI
built for exactly this — one command per action, an answer on stdout.

## Once, per machine

The implement and review workflows install it before the agent starts.
Anywhere else:

```bash
npm install -g agent-browser
agent-browser install
```

## Asking your own question

Start the app with `npm run dev` first, and wait for it to answer rather than
sleeping a fixed time:

```bash
(npm run dev > /tmp/dev.log 2>&1 &)
until curl -sf -o /dev/null http://localhost:5173; do sleep 1; done
```

The examples below use `http://localhost:5173`, the dev server's default
address. If `npm run dev` printed a different one, use that.

## Signing in

Sign in by posting to `/api/switch-user` from the page. The session cookie
sticks for every command after it:

```bash
agent-browser open http://localhost:5173/
agent-browser eval 'fetch("/api/switch-user", {method: "POST", body: new URLSearchParams({userId: "5"}), redirect: "manual"}).then(r => r.status)'
```

Seeded people, fresh from `npm run db:seed`:

| id  | Person           | Role       | Notes                                           |
| --- | ---------------- | ---------- | ----------------------------------------------- |
| 1   | Alex Rivera      | admin      |                                                 |
| 2   | Sarah Chen       | instructor | teaches `introduction-to-typescript`            |
| 5   | Emma Wilson      | student    | enrolled in `introduction-to-typescript`        |
| 10  | Bossy McBossface | student    | not enrolled in it: sees the locked lesson view |

`/api/set-dev-country` sets the country the same way.

A screenshot is pixels. To verify a fix you need a yes or a no, so read the
DOM:

```bash
agent-browser open http://localhost:5173/courses
agent-browser find placeholder "Search courses..." fill "typescript"
agent-browser find role button click --name "Search"

# Did the search reach the URL?
agent-browser get url

# How many course cards came back?
agent-browser get count 'a[href^="/courses/"]'

# What does the empty state say, if there is one?
agent-browser get text main

# Did anything break?
agent-browser errors
agent-browser console
```

The commands worth knowing: `open`, `click`, `fill`,
`find <role|text|label|placeholder> …`, `wait`, `get text|html|attr|count|url`,
`is visible|enabled|checked`, `eval`, `snapshot` (the accessibility tree, with
refs), `screenshot`, `console`, `errors`, `close`. `agent-browser --help` has
the rest.

**Ask the page, do not ask the person.** A change you have not looked at is a
change you are reporting on trust.

Screenshots are PR evidence: a before and an after for a change that shows in
the UI.

## Three things that will bite you

**The page scrolls inside `<main>`, not the window.** The app layout
(`app/routes/layout.app.tsx`) is a full-height flex box with
`main.overflow-y-auto`, so `window.scrollTo` does nothing. Scroll the element
you want into view before a screenshot:

```bash
agent-browser eval '[...document.querySelectorAll("h2")].find(h => h.textContent.includes("Your notes")).scrollIntoView({block: "start"})'
agent-browser screenshot /tmp/evidence/after.png
```

**Hydration lags "networkidle".** The button is in the server HTML before
React attaches its `onClick`, so the first click can be a silent no-op. Poll
for the click's effect and click again, rather than waiting a fixed time.

**Vite re-optimizes on the first load.** On a fresh checkout, the first page
load discovers dependencies Vite has not pre-bundled, and pushes a full-page
reload a moment after the response has finished. Absorb it once against a
throwaway load before the real loop; otherwise it lands mid-interaction and
every click after it hits a page that is already navigating away.
