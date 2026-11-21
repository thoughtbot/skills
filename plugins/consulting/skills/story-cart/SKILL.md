---
name: story-cart
description: Launch Story Cart, a click-to-story tool for HTML prototypes. The user clicks or records interactions on a prototype page (local file, folder, or URL), Claude drafts stories in the write-stories style, the user adds them to a cart, groups the cart into an epic, refines all stories in the epic at once, and publishes to the tracker. Use when the user wants to generate stories from a prototype, mockup, or HTML page, or mentions Story Cart.
argument-hint: "<prototype file, folder, or URL>"
---

# Story Cart

A local tool that turns clicks on an HTML prototype into tracker stories. Stories are written with the `write-stories` skill from the same plugin, which the tool reads on every draft, so changes to that skill apply automatically.

Requires Node 18 or later and the `claude` CLI, which the tool runs in the background (`claude -p`) to draft and publish.

## Launch

1. Work out the target from the arguments: an HTML file, a folder of HTML files, or a URL. Ask if none was given.
2. Start the server in the background from the current project directory, so the tracker connector (for example Shortcut) configured for this project is available when publishing:

   ```bash
   node <this skill's base directory>/server.mjs <target>
   ```

   Options: `--port 4599` (default), `--model <model>`, `--publish-tools mcp__shortcut` (comma-separated tool or server names allowed while publishing; default `mcp__shortcut`, so set it for another tracker's connector, for example `--publish-tools mcp__linear`), `--state-dir <dir>` (default `./.story-cart`), `--shortcut-token-file <path>` (default `~/.config/story-cart/shortcut_token`).

   Attaching pictures is supported for Shortcut only, and needs a Shortcut API token, because the Shortcut connector can't upload files. Story Cart reads `SHORTCUT_API_TOKEN` or the token file at publish time, so no restart is needed after adding it. Without a token, stories still publish and the epic page notes which pictures weren't attached.
3. Open the URL it prints (`open http://localhost:4599/...`). For a URL target, open `http://localhost:4599/__story-cart`, drag the bookmarklet to the bookmarks bar, then click it on the prototype page.
4. Tell the user how to use it (below), and that drafting and publishing run `claude -p` in the background.

If port 4599 is taken, another Story Cart is probably running. Check with `lsof -i :4599` before starting a second one on another port.

## How the user works with it

- **Inspect:** hover a block and click to capture what it contains. While hovering, ↑ outlines the surrounding block and ↓ goes back down. "Widen" grows the last pick to its parent after clicking.
- **📷 Pictures:** when the camera toggle is on, each Inspect click also saves a picture of that block. Claude looks at the pictures while drafting. Each picture has an **Attach** checkbox for publishing.
- **Record:** use the prototype normally. Clicks, field entries, submits, messages that appear (errors, flashes), and page changes are captured in order and become the acceptance criteria steps.
- **Draft story / Update draft:** Claude drafts or updates the story from everything captured, plus an optional note or correction. Repeat until it's right.
- **Add to cart**, then in the **Cart** tab pick stories and **Move to epic**: a new epic, an existing one, or the built-in **No Epic** for one-off stories. This opens the epic review page.
- **Epic review:** one instruction refines all stories at once. Each change shows as a diff to accept or reject. "Review for gaps" asks for suggestions only. The user sets the order by hand.
- **Publish:** with tracker instructions like "Shortcut, team Core", it creates the epic (name only) and the stories in the order shown. Stories in **No Epic** are created without an epic. Only unpublished stories are sent, so an epic can be published again after more stories are added. Blockers aren't set; the user adds them in the tracker. Publishing is the approval step: it only happens when the user clicks it, after a confirmation.

State lives in `.story-cart/state.json` in the launch directory. Suggest adding `.story-cart/` to `.gitignore`.

## Stopping

Stop the background server when the user is done.
