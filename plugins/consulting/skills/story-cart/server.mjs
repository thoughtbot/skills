#!/usr/bin/env node
// Story Cart: serves an HTML prototype with a click-to-story overlay, keeps a
// cart of drafted stories, groups them into epics, and publishes via Claude Code.
//
// Usage: node server.mjs <file|dir|url> [--port 4599] [--model <model>]
//          [--publish-tools mcp__shortcut] [--state-dir <dir>]

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
// write-stories ships next to this skill in the same plugin; fall back to a personal install.
const WRITE_STORIES_SKILL = [
  path.join(SKILL_DIR, "../write-stories/SKILL.md"),
  path.join(os.homedir(), ".claude/skills/write-stories/SKILL.md"),
].find((candidate) => fs.existsSync(candidate));
const PREFIX = "/__story-cart";

// ---------- args ----------

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  } else {
    const value = args[index + 1];
    args.splice(index, 2);
    return value;
  }
};

const port = Number(option("port", 4599));
const model = option("model", null);
const publishTools = option("publish-tools", "mcp__shortcut").split(",");
const shortcutTokenFile = path.resolve(option("shortcut-token-file", path.join(os.homedir(), ".config/story-cart/shortcut_token")));
const launchDir = process.cwd();
const stateDir = path.resolve(option("state-dir", path.join(launchDir, ".story-cart")));
const target = args[0] || ".";
const targetIsUrl = /^https?:\/\//.test(target);

let rootDir = null;
let startPath = "/";
if (!targetIsUrl) {
  const resolved = path.resolve(target);
  if (fs.statSync(resolved).isDirectory()) {
    rootDir = resolved;
  } else {
    rootDir = path.dirname(resolved);
    startPath = "/" + encodeURIComponent(path.basename(resolved));
  }
}

// ---------- state ----------

const stateFile = path.join(stateDir, "state.json");
const imagesDir = path.join(stateDir, "images");
fs.mkdirSync(imagesDir, { recursive: true });

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return { stories: {}, epics: {} };
  }
}

let state = loadState();

// "No Epic" is a built-in epic for one-off stories. They're published without an epic.
const NO_EPIC_ID = "no-epic";
const ensureNoEpic = () => {
  state.epics[NO_EPIC_ID] ??= { id: NO_EPIC_ID, name: "No Epic", noEpic: true, storyIds: [], messages: [], proposals: [], suggestions: [], published: null, createdAt: 0 };
};
ensureNoEpic();

function saveState() {
  const tempFile = `${stateFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
  fs.renameSync(tempFile, stateFile);
}

const newId = () => crypto.randomBytes(4).toString("hex");

function findStory(id) {
  const story = state.stories[id];
  if (!story) throw httpError(404, "Story not found");
  return story;
}

function findEpic(id) {
  const epic = state.epics[id];
  if (!epic) throw httpError(404, "Epic not found");
  return epic;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// ---------- markdown ----------

// Feature and chore steps are a checklist; bug steps stay numbered.
const usesChecklist = (draft) => draft.kind !== "bug";

function storyMarkdown(draft, { includeTitle = true, includeChecklist = true } = {}) {
  if (!draft) return "";
  const lines = [];
  if (includeTitle) lines.push(`**Title:** ${draft.title}`, "");
  if (draft.kind === "feature" && draft.userStory) {
    lines.push("**User story**", draft.userStory, "");
  }
  if (draft.kind === "bug" && draft.relatedStory) {
    lines.push(`**Related story:** ${draft.relatedStory}`, "");
  }
  if (draft.context) lines.push("**Context**", draft.context, "");
  if (!usesChecklist(draft)) {
    lines.push("**Steps to reproduce**");
    draft.acceptanceCriteria.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  } else if (includeChecklist) {
    lines.push("**Acceptance criteria**");
    draft.acceptanceCriteria.forEach((step) => lines.push(`- [ ] ${step}`));
  }
  return lines.join("\n").trim();
}

function epicMarkdown(epic) {
  const sections = epic.storyIds.map((storyId) => {
    const story = state.stories[storyId];
    const meta = `**Type:** ${story.draft?.kind || "feature"}`;
    const pictures = (story.images || []).filter((image) => image.attach).map((image) => `![${image.caption || "Picture"}](images/${image.file})`);
    return `## ${story.draft?.title || "Untitled"}\n\n${meta}\n\n${storyMarkdown(story.draft, { includeTitle: false })}${pictures.length ? `\n\n**Pictures**\n${pictures.join("\n")}` : ""}`;
  });
  return `# Epic: ${epic.name}\n\n${sections.join("\n\n---\n\n")}\n`;
}

// ---------- claude ----------

function writeStoriesGuide() {
  try {
    return fs.readFileSync(WRITE_STORIES_SKILL ?? "", "utf8");
  } catch {
    return "Write feature stories with a user story, minimal context, and failure-first acceptance criteria written as a manual test script.";
  }
}

function runClaude({ prompt, schema, cwd = stateDir, allowedTools = null, readOnlyTools = [] }) {
  return new Promise((resolve, reject) => {
    const claudeArgs = [
      "-p",
      "--output-format", "json",
      "--no-session-persistence",
      "--json-schema", JSON.stringify(schema),
    ];

    if (allowedTools) {
      claudeArgs.push("--allowedTools", ...allowedTools);
    } else if (readOnlyTools.length) {
      claudeArgs.push("--tools", ...readOnlyTools, "--allowedTools", ...readOnlyTools, "--setting-sources", "");
    } else {
      claudeArgs.push("--tools", "", "--setting-sources", "");
    }
    if (model) claudeArgs.push("--model", model);

    const child = spawn("claude", claudeArgs, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => reject(httpError(502, `Couldn't start claude: ${error.message}`)));
    child.on("close", () => {
      try {
        const response = JSON.parse(stdout);
        if (response.is_error || !response.structured_output) {
          reject(httpError(502, `Claude failed: ${response.result || stderr || "no output"}`));
        } else {
          resolve(response.structured_output);
        }
      } catch {
        reject(httpError(502, `Claude failed: ${stderr || stdout || "no output"}`.slice(0, 2000)));
      }
    });
    child.stdin.end(prompt);
  });
}

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["feature", "bug", "chore"] },
    title: { type: "string" },
    userStory: { type: "string", description: "Empty for bugs and chores" },
    relatedStory: { type: "string", description: "Bugs only; empty otherwise" },
    context: { type: "string" },
    acceptanceCriteria: { type: "array", items: { type: "string" }, description: "Steps without numbering" },
    questions: { type: "array", items: { type: "string" }, description: "Open questions or suggestions (like splits) for the author" },
  },
  required: ["kind", "title", "userStory", "context", "acceptanceCriteria", "questions"],
};

const EPIC_SCHEMA = {
  type: "object",
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          storyId: { type: "string" },
          summary: { type: "string", description: "One line on what changed and why" },
          draft: DRAFT_SCHEMA,
        },
        required: ["storyId", "summary", "draft"],
      },
    },
    suggestions: { type: "array", items: { type: "string" }, description: "Gaps, overlaps, splits. Suggestions only." },
  },
  required: ["proposals", "suggestions"],
};

const PUBLISH_SCHEMA = {
  type: "object",
  properties: {
    epicUrl: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { storyId: { type: "string" }, title: { type: "string" }, url: { type: "string" } },
        required: ["storyId", "title", "url"],
      },
    },
    notes: { type: "string" },
  },
  required: ["items", "notes"],
};

function draftPrompt(story, message) {
  return `You are drafting one tracker item from a recorded walkthrough of an HTML prototype.

<style_guide>
${writeStoriesGuide()}
</style_guide>

Rules:
- Follow the style guide's formats exactly. Decide whether this is a feature, bug or chore.
- If there are no recorded events, write the story from the author's description, and ask in "questions" about anything you had to assume (pages, copy, error messages).
- Otherwise, base the acceptance criteria on the recorded events, in order: what the author clicked, what appeared (errors, flashes), and pages visited. Quote copy that actually appeared on the page.
- Keep failure-first ordering. If an obvious failure case wasn't recorded, don't invent it; ask about it in "questions".
- Keep Context minimal, often one line.
- Preserve corrections from earlier author messages unless the newest message overrides them.
- If the story looks big, suggest a split in "questions". Never split it yourself.

<recorded_events>
${JSON.stringify(story.events, null, 2)}
</recorded_events>

<current_draft>
${story.draft ? JSON.stringify(story.draft, null, 2) : "(none yet)"}
</current_draft>

<earlier_author_messages>
${story.messages.slice(0, -1).map((text) => `- ${text}`).join("\n") || "(none)"}
</earlier_author_messages>

<newest_author_message>
${message || "(none; update the draft from the events)"}
</newest_author_message>
${picturesSection(story)}`;
}

function picturesSection(story) {
  const images = story.images || [];
  if (images.length === 0) return "";
  return `
<pictures>
The author captured pictures of the blocks they inspected. Use the Read tool to look at each one before drafting; use what you see (layout, labels, buttons, copy) to make the steps concrete.
${images.map((image) => `- ${path.join(imagesDir, image.file)}${image.caption ? ` (${image.caption})` : ""}`).join("\n")}
</pictures>`;
}

function epicPrompt(epic, message) {
  const stories = unpublishedStoryIds(epic).map((id) => ({
    storyId: id,
    draft: state.stories[id].draft,
  }));

  return `You are refining every story in an epic at once.

<style_guide>
${writeStoriesGuide()}
</style_guide>

${epic.noEpic ? "These are one-off stories that don't belong to an epic." : `Epic name: ${epic.name}`}

<stories>
${JSON.stringify(stories, null, 2)}
</stories>

<earlier_epic_messages>
${epic.messages.slice(0, -1).map((text) => `- ${text}`).join("\n") || "(none)"}
</earlier_epic_messages>

<author_instruction>
${message || "Review the epic. Make no edits unless something breaks the style guide; put gaps, overlaps, consistency issues and possible splits in suggestions."}
</author_instruction>

Rules:
- Return a proposal only for stories that actually change, with the complete updated draft. Use the given storyId.
- Change only what the instruction asks for, applied consistently across stories (wording, test accounts, preconditions, URL patterns). Don't add or rewrite other steps; put other improvements in suggestions.
- Never split, merge, add or delete stories yourself. Put those ideas in suggestions.
- Don't mention blockers or dependencies; the author handles those in the tracker.`;
}

function publishPrompt({ name, storyIds }, instructions) {
  const stories = storyIds.map((id) => ({
    storyId: id,
    kind: state.stories[id].draft.kind,
    title: state.stories[id].draft.title,
    description: storyMarkdown(state.stories[id].draft, { includeTitle: false, includeChecklist: false }),
    checklist: usesChecklist(state.stories[id].draft) ? state.stories[id].draft.acceptanceCriteria : [],
  }));

  const epicSection = name
    ? `Epic name: ${name} (name only, no description)`
    : "No epic: don't create an epic or assign these stories to one.";
  const steps = name
    ? ["Create the epic (or reuse an existing epic with exactly this name).", "Create each story in that epic"]
    : ["Create each story without an epic"];

  return `Publish these approved stories to the issue tracker. The author has already approved every story; don't ask for approval and don't change the wording.

<style_guide>
${writeStoriesGuide()}
</style_guide>

Tracker instructions from the author: ${instructions || "Use the tracker available to you."}

${epicSection}

Stories (create them in this order):
${JSON.stringify(stories, null, 2)}

Steps:
${[
    ...steps.slice(0, -1),
    `${steps.at(-1)}, with its title as the name and the description as given. Set story type with the tracker's native field (feature, bug, chore). If chores have no native type, use a "chore" label, creating it if needed.`,
    "For each story with a non-empty checklist, add every item to the story's native checklist (in Shortcut, its tasks), one per item, in the given order, unticked. If the tracker has no checklist feature, append them to the description under **Acceptance criteria** as Markdown checkboxes (- [ ] …) instead.",
    "Don't add blocker or dependency links; the author adds those manually.",
    "Return the URLs you created.",
  ].map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
}

function deleteImageFile(image) {
  try {
    fs.unlinkSync(path.join(imagesDir, image.file));
  } catch {
    // Already gone.
  }
}

function shortcutToken() {
  if (process.env.SHORTCUT_API_TOKEN) {
    return process.env.SHORTCUT_API_TOKEN.trim();
  } else {
    try {
      return fs.readFileSync(shortcutTokenFile, "utf8").trim();
    } catch {
      return "";
    }
  }
}

// Shortcut's connector can't upload files, so pictures go through its REST API.
async function attachPictures(storyIds, items) {
  const token = shortcutToken();
  const results = [];

  for (const item of items) {
    const story = state.stories[item.storyId];
    const images = (story?.images || []).filter((image) => image.attach);
    const shortcutStoryId = /app\.shortcut\.com\/[^/]+\/story\/(\d+)/.exec(item.url || "")?.[1];
    const shouldAttach = storyIds.includes(item.storyId) && images.length > 0;

    if (!shouldAttach) {
      continue;
    } else if (!shortcutStoryId) {
      results.push(`"${item.title}": pictures not attached (only Shortcut is supported).`);
    } else if (!token) {
      results.push(`"${item.title}": ${images.length} picture(s) not attached. Add a Shortcut API token to ${shortcutTokenFile} or SHORTCUT_API_TOKEN.`);
    } else {
      try {
        for (let start = 0; start < images.length; start += 4) {
          const form = new FormData();
          form.append("story_id", shortcutStoryId);
          images.slice(start, start + 4).forEach((image, index) => {
            const bytes = fs.readFileSync(path.join(imagesDir, image.file));
            form.append(`file${index}`, new Blob([bytes], { type: "image/png" }), image.file);
          });
          const response = await fetch("https://api.app.shortcut.com/api/v3/files", {
            method: "POST",
            headers: { "Shortcut-Token": token },
            body: form,
          });
          if (!response.ok) throw new Error(`Shortcut said ${response.status} ${await response.text()}`.slice(0, 300));
        }
        story.published.picturesAttached = images.length;
      } catch (error) {
        results.push(`"${item.title}": pictures not attached (${error.message}).`);
      }
    }
  }
  return results;
}

// Clearing keeps a backup: the old state file and pictures move into .story-cart/backups/.
function resetState() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(stateDir, "backups", stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  if (fs.existsSync(stateFile)) fs.copyFileSync(stateFile, path.join(backupDir, "state.json"));
  if (fs.existsSync(imagesDir)) fs.renameSync(imagesDir, path.join(backupDir, "images"));
  fs.mkdirSync(imagesDir, { recursive: true });

  state = { stories: {}, epics: {}, settings: state.settings };
  ensureNoEpic();
  saveState();
  return { ok: true, backup: backupDir };
}

function unpublishedStoryIds(epic) {
  return epic.storyIds.filter((id) => !state.stories[id]?.published);
}

// ---------- api ----------

async function handleApi(method, route, body) {
  const parts = route.split("/").filter(Boolean);

  if (method === "GET" && route === "/state") {
    return state;
  }

  if (method === "POST" && route === "/reset") {
    return resetState();
  }

  if (parts[0] === "stories") {
    if (method === "POST" && parts.length === 1) {
      const story = { id: newId(), status: "draft", events: [], messages: [], draft: null, createdAt: Date.now() };
      state.stories[story.id] = story;
      saveState();
      return story;
    }

    const story = findStory(parts[1]);

    if (method === "PATCH" && parts.length === 2) {
      if (body.status) story.status = body.status;
      if (body.draft) story.draft = body.draft;
      saveState();
      return story;
    }

    if (method === "DELETE" && parts.length === 2) {
      (story.images || []).forEach(deleteImageFile);
      delete state.stories[story.id];
      Object.values(state.epics).forEach((epic) => {
        epic.storyIds = epic.storyIds.filter((id) => id !== story.id);
      });
      saveState();
      return { ok: true };
    }

    if (method === "POST" && parts[2] === "images" && parts.length === 3) {
      const match = /^data:image\/png;base64,(.+)$/.exec(body.dataUrl || "");
      if (!match) throw httpError(422, "Expected a PNG picture.");
      const image = { id: newId(), file: `${story.id}-${newId()}.png`, caption: (body.caption || "").slice(0, 200), attach: true, at: Date.now() };
      fs.writeFileSync(path.join(imagesDir, image.file), Buffer.from(match[1], "base64"));
      story.images = [...(story.images || []), image];
      saveState();
      return story;
    }

    if (parts[2] === "images" && parts.length === 4) {
      const image = (story.images || []).find((candidate) => candidate.id === parts[3]);
      if (!image) throw httpError(404, "Picture not found");
      if (method === "PATCH") {
        if (typeof body.attach === "boolean") image.attach = body.attach;
      } else if (method === "DELETE") {
        deleteImageFile(image);
        story.images = story.images.filter((candidate) => candidate.id !== image.id);
      }
      saveState();
      return story;
    }

    if (method === "POST" && parts[2] === "events") {
      story.events.push({ ...body, at: Date.now() });
      saveState();
      return story;
    }

    if (method === "DELETE" && parts[2] === "events") {
      story.events.splice(Number(parts[3]), 1);
      saveState();
      return story;
    }

    if (method === "POST" && parts[2] === "draft") {
      const message = (body.message || "").trim();
      const hasSomethingToDraftFrom = story.events.length > 0 || message || story.draft;
      if (!hasSomethingToDraftFrom) {
        throw httpError(422, "Capture or record something on the page first, or type a note.");
      }
      if (message) story.messages.push(message);
      story.draft = await runClaude({
        prompt: draftPrompt(story, message),
        schema: DRAFT_SCHEMA,
        readOnlyTools: story.images?.length ? ["Read"] : [],
      });
      saveState();
      return story;
    }
  }

  if (parts[0] === "epics") {
    if (method === "POST" && parts.length === 1) {
      const name = (body.name || "").trim();
      const storyIds = (body.storyIds || []).filter((id) => state.stories[id]?.draft);
      if (!name) throw httpError(422, "Give the epic a name.");
      if (storyIds.length === 0) throw httpError(422, "Pick at least one drafted story from the cart.");
      const epic = { id: newId(), name, storyIds, messages: [], proposals: [], suggestions: [], published: null, createdAt: Date.now() };
      state.epics[epic.id] = epic;
      storyIds.forEach((id) => (state.stories[id].status = "epic"));
      saveState();
      return epic;
    }

    const epic = findEpic(parts[1]);

    if (method === "GET" && parts[2] === "markdown") {
      return { markdown: epicMarkdown(epic) };
    }

    if (method === "PATCH" && parts.length === 2) {
      if (body.name?.trim() && !epic.noEpic) epic.name = body.name.trim();
      if (typeof body.trackerInstructions === "string") {
        epic.trackerInstructions = body.trackerInstructions.slice(0, 500);
        state.settings = { ...state.settings, lastTrackerInstructions: epic.trackerInstructions };
      }
      if (body.addStoryIds) {
        body.addStoryIds
          .filter((id) => state.stories[id]?.draft && !epic.storyIds.includes(id))
          .forEach((id) => {
            epic.storyIds.push(id);
            state.stories[id].status = "epic";
          });
      }
      if (body.removeStoryId && !state.stories[body.removeStoryId]?.published) {
        epic.storyIds = epic.storyIds.filter((id) => id !== body.removeStoryId);
        if (state.stories[body.removeStoryId]) state.stories[body.removeStoryId].status = "cart";
      }
      if (body.storyIds) {
        const sameStories = body.storyIds.length === epic.storyIds.length && body.storyIds.every((id) => epic.storyIds.includes(id));
        if (sameStories) epic.storyIds = body.storyIds;
      }
      saveState();
      return epic;
    }

    if (method === "POST" && parts[2] === "refine") {
      const message = (body.message || "").trim();
      if (unpublishedStoryIds(epic).length === 0) throw httpError(422, "There are no unpublished stories to refine.");
      if (message) epic.messages.push(message);
      const result = await runClaude({ prompt: epicPrompt(epic, message), schema: EPIC_SCHEMA });
      epic.proposals = result.proposals
        .filter((proposal) => unpublishedStoryIds(epic).includes(proposal.storyId))
        .map((proposal) => ({ ...proposal, before: state.stories[proposal.storyId].draft }));
      epic.suggestions = result.suggestions;
      saveState();
      return epic;
    }

    if (method === "POST" && parts[2] === "proposals") {
      const storyId = parts[3];
      const decision = parts[4];
      const proposal = epic.proposals.find((candidate) => candidate.storyId === storyId);
      if (!proposal) throw httpError(404, "That proposal is gone. Refine again.");
      if (decision === "accept") state.stories[storyId].draft = proposal.draft;
      epic.proposals = epic.proposals.filter((candidate) => candidate.storyId !== storyId);
      saveState();
      return epic;
    }

    if (method === "POST" && parts[2] === "publish") {
      const storyIds = unpublishedStoryIds(epic);
      if (epic.proposals.length > 0) {
        throw httpError(422, "Accept or reject the pending proposals before publishing.");
      }
      if (storyIds.length === 0) throw httpError(422, "Every story here is already published.");
      const result = await runClaude({
        prompt: publishPrompt({ name: epic.noEpic ? null : epic.name, storyIds }, body.instructions),
        schema: PUBLISH_SCHEMA,
        cwd: launchDir,
        allowedTools: publishTools,
      });
      result.items
        .filter((item) => storyIds.includes(item.storyId))
        .forEach((item) => (state.stories[item.storyId].published = { url: item.url, at: Date.now() }));
      const pictureProblems = await attachPictures(storyIds, result.items);
      epic.published = {
        epicUrl: result.epicUrl || epic.published?.epicUrl || "",
        notes: [result.notes, ...pictureProblems].filter(Boolean).join("\n"),
        at: Date.now(),
        instructions: body.instructions || "",
      };
      saveState();
      return epic;
    }
  }

  throw httpError(404, "Unknown route");
}

// ---------- static ----------

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const OVERLAY_TAG = `<script src="${PREFIX}/overlay.js"></script>`;

function injectOverlay(html) {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${OVERLAY_TAG}</body>`);
  } else {
    return html + OVERLAY_TAG;
  }
}

function homePage() {
  const htmlFiles = rootDir ? listHtmlFiles(rootDir).slice(0, 200) : [];
  const bookmarklet = `javascript:(()=>{if(window.__storyCart)return;const s=document.createElement('script');s.src='http://localhost:${port}${PREFIX}/overlay.js';document.body.appendChild(s)})()`;
  const stories = Object.values(state.stories);
  const epics = [...Object.values(state.epics).filter((epic) => epic.noEpic), ...Object.values(state.epics).filter((epic) => !epic.noEpic)];
  const cartStories = stories.filter((story) => story.status === "cart");
  const counts = {
    drafting: stories.filter((story) => story.status === "draft").length,
    cart: cartStories.length,
    epics: epics.filter((epic) => !epic.noEpic).length,
    published: stories.filter((story) => story.published).length,
  };

  const fileCard = (file) => {
    const stats = fs.statSync(path.join(rootDir, file));
    const href = `/${file.split("/").map(encodeURIComponent).join("/")}`;
    const folder = path.dirname(file) === "." ? "" : path.dirname(file);
    return `
      <a class="card file" href="${href}">
        <span class="file-icon" aria-hidden="true">◧</span>
        <span class="file-body">
          <strong>${escapeHtml(path.basename(file))}</strong>
          <span class="muted">${folder ? `${escapeHtml(folder)} · ` : ""}${formatSize(stats.size)} · edited ${formatDate(stats.mtime)}</span>
        </span>
        <span class="open">Open →</span>
      </a>`;
  };

  const epicRow = (epic) => {
    const published = epic.storyIds.filter((id) => state.stories[id]?.published).length;
    const pending = epic.proposals?.length || 0;
    const details = [
      `${epic.storyIds.length} stor${epic.storyIds.length === 1 ? "y" : "ies"}`,
      published ? `${published} published` : "",
      pending ? `${pending} change${pending === 1 ? "" : "s"} to review` : "",
    ].filter(Boolean).join(" · ");
    return `
      <a class="row-link" href="${PREFIX}/epics/${epic.id}">
        <span>
          <strong>${escapeHtml(epic.name)}</strong>
          ${epic.noEpic ? `<span class="tag">one-off stories</span>` : ""}
          <span class="muted block">${details}</span>
        </span>
        <span class="open">Review →</span>
      </a>`;
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Story Cart</title>
<style>
  :root {
    --bg: #f6f8fa; --surface: #ffffff; --fg: #1f2328; --muted: #656d76; --border: #d0d7de;
    --accent: #8250df; --accent-soft: #fbefff; --link: #0969da; --ok: #1f883d; --danger: #cf222e;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0d1117; --surface: #161b22; --fg: #e6edf3; --muted: #8d96a0; --border: #30363d;
      --accent: #a371f7; --accent-soft: #2a1f3d; --link: #4493f8; --ok: #3fb950; --danger: #f85149;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0d1117; --surface: #161b22; --fg: #e6edf3; --muted: #8d96a0; --border: #30363d;
    --accent: #a371f7; --accent-soft: #2a1f3d; --link: #4493f8; --ok: #3fb950; --danger: #f85149;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 40px 16px 64px; display: flex; flex-direction: column; gap: 28px; }
  a { color: var(--link); text-decoration: none; }
  header h1 { margin: 0; font-size: 30px; letter-spacing: -0.01em; }
  header h1 span { color: var(--accent); }
  header p { margin: 4px 0 0; color: var(--muted); }
  h2 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .muted { color: var(--muted); font-size: 13px; }
  .block { display: block; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
  .stat strong { display: block; font-size: 24px; line-height: 1.2; }
  .stat span { color: var(--muted); font-size: 13px; }
  .card, .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
  .files { display: flex; flex-direction: column; gap: 8px; }
  .file { display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--fg); transition: border-color 0.15s; }
  .file:hover, .row-link:hover { border-color: var(--accent); }
  .file-icon { font-size: 22px; color: var(--accent); }
  .file-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .file-body strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .open { color: var(--link); font-size: 14px; white-space: nowrap; }
  .panel { overflow: hidden; }
  .row-link { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; color: var(--fg); border: 1px solid transparent; border-bottom-color: var(--border); }
  .panel .row-link:last-child { border-bottom-color: transparent; }
  .tag { display: inline-block; margin-left: 6px; font-size: 11px; padding: 0 8px; border-radius: 10px; background: var(--accent-soft); color: var(--accent); vertical-align: 2px; }
  .empty { padding: 16px; color: var(--muted); }
  .cart-list { margin: 0; padding: 12px 16px 12px 34px; }
  .cart-list li { padding: 2px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .steps { margin: 0; padding: 14px 16px 14px 34px; display: flex; flex-direction: column; gap: 6px; }
  .bookmarklet { display: inline-block; margin-top: 10px; padding: 6px 14px; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 600; cursor: grab; }
  .bookmarklet-panel { padding: 14px 16px; }
  .bookmarklet-panel p { margin: 0; }
  .danger-panel { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
  .danger-panel p { margin: 0; }
  .danger-panel code { font-size: 12px; background: var(--bg); padding: 1px 4px; border-radius: 4px; }
  .danger-button { font: inherit; font-size: 14px; padding: 6px 14px; border-radius: 6px; border: 1px solid var(--danger); background: transparent; color: var(--danger); cursor: pointer; }
  .danger-button:hover:not(:disabled) { background: var(--danger); color: #fff; }
  .danger-button:disabled { opacity: 0.5; cursor: default; }
  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    .two-col { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<main>
  <header>
    <h1>Story <span>Cart</span></h1>
    <p>Click through a prototype, and turn what you see into tracker stories.</p>
  </header>

  <section class="stats" aria-label="Summary">
    <div class="stat"><strong>${counts.drafting}</strong><span>Drafting</span></div>
    <div class="stat"><strong>${counts.cart}</strong><span>In the cart</span></div>
    <div class="stat"><strong>${counts.epics}</strong><span>Epics</span></div>
    <div class="stat"><strong>${counts.published}</strong><span>Published</span></div>
  </section>

  ${rootDir ? `
  <section>
    <h2>Prototype pages</h2>
    <div class="files">${htmlFiles.map(fileCard).join("") || `<div class="card empty">No HTML files found in ${escapeHtml(rootDir)}.</div>`}</div>
  </section>` : ""}

  <section>
    <h2>Epics</h2>
    <div class="panel">${epics.map(epicRow).join("") || `<div class="empty">No epics yet.</div>`}</div>
  </section>

  <div class="two-col">
    <section>
      <h2>In the cart</h2>
      <div class="panel">${cartStories.length
        ? `<ol class="cart-list">${cartStories.map((story) => `<li>${escapeHtml(story.draft?.title || "Untitled")}</li>`).join("")}</ol>`
        : `<div class="empty">Empty. Draft a story on a prototype page and add it to the cart.</div>`}</div>
    </section>
    <section>
      <h2>How it works</h2>
      <div class="panel">
        <ol class="steps">
          <li><strong>Inspect</strong> or <strong>Record</strong> on a prototype page, or write a story yourself.</li>
          <li><strong>Draft</strong> it, and answer Claude's questions until it's right.</li>
          <li><strong>Add to cart</strong>, then move stories into an epic or No Epic.</li>
          <li><strong>Review</strong> the epic, then <strong>publish</strong> to your tracker.</li>
        </ol>
      </div>
    </section>
  </div>

  <section>
    <h2>Prototype on another URL?</h2>
    <div class="panel bookmarklet-panel">
      <p class="muted">Drag this button to your bookmarks bar. Open the prototype, then click the bookmark to add the Story Cart panel.</p>
      <a class="bookmarklet" href="${bookmarklet}">Story Cart</a>
    </div>
  </section>

  <section>
    <h2>Start over</h2>
    <div class="panel danger-panel">
      <p class="muted">Clears every draft, cart item, epic and picture so you can start fresh. A backup is saved in <code>.story-cart/backups/</code>, and stories already in your tracker aren't touched.</p>
      <button class="danger-button" data-reset ${stories.length || counts.epics ? "" : "disabled"}>Clear everything</button>
      <p class="muted" data-reset-status role="status"></p>
    </div>
  </section>
</main>
<script>
  document.querySelector("[data-reset]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const status = document.querySelector("[data-reset-status]");
    if (!confirm("Clear all drafts, cart items, epics and pictures? A backup is kept, and your tracker isn't touched.")) return;
    button.disabled = true;
    status.textContent = "Clearing…";
    try {
      const response = await fetch("${PREFIX}/api/reset", { method: "POST" });
      if (!response.ok) throw new Error((await response.json()).error || "Request failed");
      location.reload();
    } catch (error) {
      status.textContent = "Couldn't clear: " + error.message;
      button.disabled = false;
    }
  });
</script>
</body>
</html>`;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  } else {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function listHtmlFiles(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listHtmlFiles(path.join(dir, entry.name), relative);
    return /\.html?$/i.test(entry.name) ? [relative] : [];
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function serveFile(response, filePath, inject) {
  const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  if (inject && type.startsWith("text/html")) {
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    response.end(injectOverlay(fs.readFileSync(filePath, "utf8")));
  } else {
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    fs.createReadStream(filePath).pipe(response);
  }
}

// ---------- server ----------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
};

function readBody(request) {
  return new Promise((resolve) => {
    let raw = "";
    request.on("data", (chunk) => (raw += chunk));
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS_HEADERS);
    response.end();
    return;
  }

  try {
    if (pathname.startsWith(`${PREFIX}/api/`)) {
      const body = await readBody(request);
      const result = await handleApi(request.method, pathname.slice(`${PREFIX}/api`.length), body);
      response.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
      response.end(JSON.stringify(result));
    } else if (pathname === `${PREFIX}/overlay.js`) {
      response.writeHead(200, { ...CORS_HEADERS, "Content-Type": "text/javascript", "Cache-Control": "no-store" });
      response.end(fs.readFileSync(path.join(SKILL_DIR, "overlay.js")));
    } else if (pathname.startsWith(`${PREFIX}/images/`)) {
      const file = path.basename(pathname);
      const filePath = path.join(imagesDir, file);
      if (!fs.existsSync(filePath)) throw httpError(404, "Not found");
      response.writeHead(200, { ...CORS_HEADERS, "Content-Type": "image/png", "Cache-Control": "no-store" });
      fs.createReadStream(filePath).pipe(response);
    } else if (pathname === `${PREFIX}/vendor/modern-screenshot.js`) {
      response.writeHead(200, { ...CORS_HEADERS, "Content-Type": "text/javascript" });
      response.end(fs.readFileSync(path.join(SKILL_DIR, "vendor/modern-screenshot.js")));
    } else if (pathname.startsWith(`${PREFIX}/epics/`)) {
      serveFile(response, path.join(SKILL_DIR, "epic.html"), false);
    } else if (pathname === PREFIX || pathname === `${PREFIX}/`) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(homePage());
    } else if (rootDir) {
      const filePath = path.join(rootDir, pathname);
      const insideRoot = filePath === rootDir || filePath.startsWith(rootDir + path.sep);
      if (!insideRoot) throw httpError(403, "Forbidden");
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        const index = path.join(filePath, "index.html");
        if (fs.existsSync(index)) {
          serveFile(response, index, true);
        } else {
          response.writeHead(302, { Location: PREFIX });
          response.end();
        }
      } else if (fs.existsSync(filePath)) {
        serveFile(response, filePath, true);
      } else {
        throw httpError(404, "Not found");
      }
    } else {
      response.writeHead(302, { Location: PREFIX });
      response.end();
    }
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    response.writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  const openUrl = rootDir ? `http://localhost:${port}${startPath}` : `http://localhost:${port}${PREFIX}`;
  console.log(`Story Cart running at ${openUrl}`);
  console.log(`State: ${stateFile}`);
  if (targetIsUrl) console.log(`Prototype URL: ${target} (use the bookmarklet on the home page)`);
});
