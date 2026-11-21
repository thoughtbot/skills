// Story Cart overlay: inspect or record a prototype, draft a story, add it to the cart.
(() => {
  if (window.__storyCart) return;
  window.__storyCart = true;

  const BASE = new URL(document.currentScript?.src || "http://localhost:4599/__story-cart/overlay.js").origin;
  const API = `${BASE}/__story-cart/api`;
  const STORAGE_KEY = "storyCart.v1";

  // ---------- persistence (per-viewer conveniences only) ----------

  const prefs = (() => {
    try {
      return { mode: "off", open: true, tab: "story", currentStoryId: null, target: "__new", camera: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { mode: "off", open: true, tab: "story", currentStoryId: null, target: "__new", camera: false };
    }
  })();

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage can be blocked; the overlay still works for this page view.
    }
  }

  // ---------- api ----------

  async function api(method, route, body) {
    const response = await fetch(`${API}${route}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      keepalive: method !== "GET" && route.includes("/events"),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  let data = { stories: {}, epics: {} };
  let busy = false;
  let errorMessage = "";
  let lastInspected = null;
  let pendingNote = "";

  async function refresh() {
    try {
      data = await api("GET", "/state");
      if (prefs.currentStoryId && !data.stories[prefs.currentStoryId]) {
        prefs.currentStoryId = null;
        savePrefs();
      }
      errorMessage = "";
    } catch (error) {
      errorMessage = `Can't reach Story Cart at ${BASE}. Is the server running?`;
    }
    render();
  }

  const currentStory = () => data.stories[prefs.currentStoryId];

  async function ensureStory() {
    if (!currentStory()) {
      const story = await api("POST", "/stories");
      data.stories[story.id] = story;
      prefs.currentStoryId = story.id;
      savePrefs();
    }
    return currentStory();
  }

  async function addEvent(event) {
    try {
      const story = await ensureStory();
      const updated = await api("POST", `/stories/${story.id}/events`, event);
      data.stories[story.id] = updated;
      prefs.tab = "story";
      savePrefs();
      render();
    } catch (error) {
      showError(error.message);
    }
  }

  function showError(message) {
    errorMessage = message;
    render();
  }

  // ---------- describing the page ----------

  const isOurs = (node) => node === host || host.contains(node);

  function visibleText(element, max = 600) {
    const text = (element.innerText || element.textContent || "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function selectorFor(element) {
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && parts.length < 3 && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const classes = [...node.classList].slice(0, 2);
      if (classes.length) part += `.${classes.join(".")}`;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  function labelFor(field) {
    const byFor = field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
    const wrapping = field.closest("label");
    return (
      (byFor && visibleText(byFor, 80)) ||
      (wrapping && visibleText(wrapping, 80)) ||
      field.getAttribute("aria-label") ||
      field.getAttribute("placeholder") ||
      field.name ||
      field.id ||
      field.tagName.toLowerCase()
    );
  }

  function describeFields(container) {
    return [...container.querySelectorAll("input, select, textarea")]
      .filter((field) => field.type !== "hidden" && !isOurs(field))
      .slice(0, 30)
      .map((field) => ({
        label: labelFor(field),
        type: field.tagName === "SELECT" ? "select" : field.tagName === "TEXTAREA" ? "textarea" : field.type,
        required: field.required || undefined,
        options: field.tagName === "SELECT" ? [...field.options].slice(0, 10).map((option) => option.text) : undefined,
      }));
  }

  function describeButtons(container) {
    return [...container.querySelectorAll("button, input[type=submit], a[href]")]
      .filter((button) => !isOurs(button))
      .slice(0, 15)
      .map((button) => visibleText(button, 60) || button.value || button.getAttribute("aria-label"))
      .filter(Boolean);
  }

  function describe(element) {
    const form = element.closest("form");
    const fields = describeFields(element);
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || undefined,
      selector: selectorFor(element),
      text: visibleText(element),
      href: element.getAttribute("href") || undefined,
      fields: fields.length ? fields : undefined,
      buttons: element.children.length ? describeButtons(element) : undefined,
      enclosingForm: form && form !== element ? { selector: selectorFor(form), fields: describeFields(form) } : undefined,
    };
  }

  function describeTarget(element) {
    return {
      tag: element.tagName.toLowerCase(),
      selector: selectorFor(element),
      text: visibleText(element, 120) || element.value || element.getAttribute("aria-label") || "",
      href: element.getAttribute("href") || undefined,
    };
  }

  const MESSAGE_SELECTOR = [
    "[role=alert]", "[role=status]", "[aria-live]", ".flash", ".alert", ".notice", ".error", ".errors",
    ".invalid-feedback", ".field_with_errors", "[class*=error]", "[class*=flash]", "[class*=alert]", "[class*=toast]",
  ].join(",");

  function visibleMessages() {
    return [...document.querySelectorAll(MESSAGE_SELECTOR)]
      .filter((element) => !isOurs(element) && isVisible(element))
      .map((element) => visibleText(element, 200))
      .filter(Boolean);
  }

  function pageEvent() {
    return {
      type: "page",
      url: location.protocol === "file:" ? location.pathname.split("/").pop() : location.pathname + location.search,
      title: document.title,
      headings: [...document.querySelectorAll("h1, h2")].filter((heading) => !isOurs(heading)).slice(0, 6).map((heading) => visibleText(heading, 100)),
      messages: visibleMessages(),
    };
  }

  // ---------- inspect mode ----------

  // While hovering, ↑ outlines the surrounding block and ↓ goes back down.
  // hoverPath[0] is the element under the mouse; the last entry is what's outlined.
  let hoverPath = [];
  const hovered = () => hoverPath.at(-1) || null;

  function onInspectMove(event) {
    const element = event.target;
    if (isOurs(element)) {
      hoverPath = [];
      highlight(null);
    } else if (hoverPath[0] !== element) {
      hoverPath = [element];
      highlight(element);
    }
  }

  function onInspectKey(event) {
    const current = hovered();
    const parent = current?.parentElement;
    const canWiden = parent && parent !== document.documentElement;
    const typingInPanel = isOurs(event.target);

    if (typingInPanel || !current) {
      return;
    } else if (event.key === "ArrowUp" && canWiden) {
      event.preventDefault();
      hoverPath.push(parent);
      highlight(parent);
    } else if (event.key === "ArrowDown" && hoverPath.length > 1) {
      event.preventDefault();
      hoverPath.pop();
      highlight(hovered());
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
    }
  }

  async function inspect(element) {
    lastInspected = element;
    lastPictureId = null;
    await addEvent({ type: "inspect", page: pageEvent().url, element: describe(element) });
    if (prefs.camera) lastPictureId = await capturePicture(element);
  }

  function onInspectClick(event) {
    if (isOurs(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const outlinedContainsClick = hovered()?.contains(event.target);
    inspect(outlinedContainsClick ? hovered() : event.target);
  }

  async function widenLastInspected() {
    const story = currentStory();
    const parent = lastInspected?.parentElement;
    const lastIndex = story ? story.events.length - 1 : -1;
    const lastIsInspect = lastIndex >= 0 && story.events[lastIndex].type === "inspect";
    if (parent && parent !== document.documentElement && lastIsInspect) {
      highlight(parent);
      try {
        await api("DELETE", `/stories/${story.id}/events/${lastIndex}`);
        if (lastPictureId) await api("DELETE", `/stories/${story.id}/images/${lastPictureId}`);
        await inspect(parent);
      } catch (error) {
        showError(error.message);
      }
    }
  }

  // ---------- pictures ----------

  let lastPictureId = null;
  let capturing = false;
  let screenshotLibrary = null;

  function loadScreenshotLibrary() {
    screenshotLibrary ??= new Promise((resolve, reject) => {
      // Hide AMD loaders so the library registers itself as a global.
      const savedDefine = window.define;
      window.define = undefined;
      const script = document.createElement("script");
      script.src = `${BASE}/__story-cart/vendor/modern-screenshot.js`;
      script.onload = () => {
        window.define = savedDefine;
        resolve(window.modernScreenshot);
      };
      script.onerror = () => {
        window.define = savedDefine;
        screenshotLibrary = null;
        reject(new Error("Couldn't load the screenshot library."));
      };
      document.head.appendChild(script);
    });
    return screenshotLibrary;
  }

  async function capturePicture(element) {
    const story = currentStory();
    capturing = true;
    render();
    try {
      const library = await loadScreenshotLibrary();
      const rect = element.getBoundingClientRect();
      const isLarge = rect.width * rect.height > 1600 * 1200;
      const dataUrl = await library.domToPng(element, {
        scale: isLarge ? 1 : Math.min(2, window.devicePixelRatio || 1),
        width: Math.ceil(Math.max(rect.width, element.scrollWidth)) + 4,
        height: Math.ceil(Math.max(rect.height, element.scrollHeight)) + 4,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        filter: (node) => node !== host,
      });
      const caption = eventLabel({ type: "inspect", element: describe(element) }).replace(/^Inspected /, "");
      const updated = await api("POST", `/stories/${story.id}/images`, { dataUrl, caption });
      data.stories[story.id] = updated;
      return updated.images.at(-1).id;
    } catch (error) {
      errorMessage = `Couldn't capture a picture: ${error.message}`;
      return null;
    } finally {
      capturing = false;
      render();
    }
  }

  // ---------- record mode ----------

  let messagesBefore = new Set();
  let messageTimer = null;

  function onRecordClick(event) {
    if (isOurs(event.target)) return;
    const target = event.target.closest("button, a, input, select, textarea, label, [role=button], [onclick]") || event.target;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) && !["submit", "button", "checkbox", "radio"].includes(target.type)) return;
    messagesBefore = new Set(visibleMessages());
    addEvent({ type: "click", page: pageEvent().url, target: describeTarget(target) });
  }

  function onRecordChange(event) {
    const field = event.target;
    if (isOurs(field) || !field.matches?.("input, select, textarea")) return;
    const value = field.type === "password" ? "••••" : field.type === "checkbox" ? String(field.checked) : field.value;
    addEvent({ type: "input", page: pageEvent().url, label: labelFor(field), value: value.slice(0, 200) });
  }

  function onRecordSubmit(event) {
    if (isOurs(event.target)) return;
    messagesBefore = new Set(visibleMessages());
    addEvent({ type: "submit", page: pageEvent().url, form: selectorFor(event.target) });
  }

  const observer = new MutationObserver((mutations) => {
    if (prefs.mode !== "record") return;
    if (mutations.every((mutation) => isOurs(mutation.target))) return;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      const appeared = visibleMessages().filter((message) => !messagesBefore.has(message));
      if (appeared.length) {
        appeared.forEach((message) => messagesBefore.add(message));
        addEvent({ type: "appeared", page: pageEvent().url, messages: appeared });
      }
    }, 700);
  });

  // ---------- mode switching ----------

  function setMode(mode) {
    prefs.mode = mode;
    savePrefs();

    document.removeEventListener("mousemove", onInspectMove, true);
    document.removeEventListener("keydown", onInspectKey, true);
    hoverPath = [];
    document.removeEventListener("click", onInspectClick, true);
    document.removeEventListener("click", onRecordClick, true);
    document.removeEventListener("change", onRecordChange, true);
    document.removeEventListener("submit", onRecordSubmit, true);
    observer.disconnect();
    highlight(null);

    if (mode === "inspect") {
      document.addEventListener("mousemove", onInspectMove, true);
      document.addEventListener("keydown", onInspectKey, true);
      document.addEventListener("click", onInspectClick, true);
    } else if (mode === "record") {
      messagesBefore = new Set(visibleMessages());
      document.addEventListener("click", onRecordClick, true);
      document.addEventListener("change", onRecordChange, true);
      document.addEventListener("submit", onRecordSubmit, true);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"], characterData: true });
    }
    render();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && prefs.mode === "inspect") setMode("off");
  });

  // ---------- actions ----------

  async function draftStory() {
    const story = currentStory();
    const message = pendingNote;
    busy = true;
    errorMessage = "";
    pendingNote = "";
    render();
    try {
      data.stories[story.id] = await api("POST", `/stories/${story.id}/draft`, { message });
    } catch (error) {
      errorMessage = error.message;
      pendingNote = message;
    }
    busy = false;
    render();
  }

  async function patchStory(id, changes) {
    data.stories[id] = await api("PATCH", `/stories/${id}`, changes);
  }

  const actions = {
    "mode": (button) => setMode(button.dataset.value),
    "toggle": () => {
      prefs.open = !prefs.open;
      savePrefs();
      render();
    },
    "tab": (button) => {
      prefs.tab = button.dataset.value;
      savePrefs();
      render();
    },
    "new-story": async () => {
      prefs.currentStoryId = null;
      await ensureStory();
      setMode("inspect");
    },
    "write-story": async () => {
      prefs.currentStoryId = null;
      await ensureStory();
      setMode("off");
      shadow.querySelector("[data-note]")?.focus();
    },
    "remove-event": async (button) => {
      const story = currentStory();
      data.stories[story.id] = await api("DELETE", `/stories/${story.id}/events/${button.dataset.index}`);
      render();
    },
    "widen": () => widenLastInspected(),
    "camera": () => {
      prefs.camera = !prefs.camera;
      savePrefs();
      if (prefs.camera) loadScreenshotLibrary().catch((error) => showError(error.message));
      render();
    },
    "remove-picture": async (button) => {
      const story = currentStory();
      data.stories[story.id] = await api("DELETE", `/stories/${story.id}/images/${button.dataset.id}`);
      render();
    },
    "draft": () => draftStory(),
    "add-to-cart": async () => {
      const story = currentStory();
      if (!story.draft) {
        showError("Update the draft before adding it to the cart.");
        return;
      }
      await patchStory(story.id, { status: "cart" });
      prefs.currentStoryId = null;
      prefs.tab = "cart";
      savePrefs();
      setMode("off");
    },
    "discard": async () => {
      const story = currentStory();
      if (confirm("Discard this story and everything captured for it?")) {
        await api("DELETE", `/stories/${story.id}`);
        delete data.stories[story.id];
        prefs.currentStoryId = null;
        savePrefs();
        render();
      }
    },
    "edit-story": async (button) => {
      await patchStory(button.dataset.id, { status: "draft" });
      prefs.currentStoryId = button.dataset.id;
      prefs.tab = "story";
      savePrefs();
      render();
    },
    "remove-from-cart": async (button) => {
      if (confirm("Delete this story from the cart?")) {
        await api("DELETE", `/stories/${button.dataset.id}`);
        delete data.stories[button.dataset.id];
        render();
      }
    },
    "move-to-epic": async () => {
      const storyIds = [...shadow.querySelectorAll("[data-cart-pick]:checked")].map((box) => box.dataset.cartPick);
      const target = data.epics[prefs.target] ? prefs.target : "__new";
      let epicId = target;
      if (target === "__new") {
        const name = shadow.querySelector("[data-epic-name]")?.value || "";
        epicId = (await api("POST", "/epics", { name, storyIds })).id;
      } else if (storyIds.length === 0) {
        showError("Pick at least one story from the cart.");
        return;
      } else {
        await api("PATCH", `/epics/${epicId}`, { addStoryIds: storyIds });
      }
      await refresh();
      prefs.tab = "epics";
      savePrefs();
      render();
      window.open(`${BASE}/__story-cart/epics/${epicId}`, "_blank");
    },
  };

  // ---------- ui ----------

  const host = document.createElement("div");
  host.id = "__story-cart-host";
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  const escapeHtml = (text) =>
    String(text ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function eventLabel(event) {
    switch (event.type) {
      case "inspect": {
        const element = event.element;
        const fieldCount = element.fields?.length;
        const summary = fieldCount ? `${element.tag} with ${fieldCount} field${fieldCount === 1 ? "" : "s"}` : element.tag;
        return `Inspected ${summary}${element.text ? `: “${element.text.slice(0, 50)}”` : ""}`;
      }
      case "click":
        return `Clicked ${event.target.tag} “${event.target.text.slice(0, 50)}”`;
      case "input":
        return `Entered ${event.label}: “${event.value.slice(0, 40)}”`;
      case "submit":
        return "Submitted the form";
      case "appeared":
        return `Appeared: ${event.messages.map((message) => `“${message.slice(0, 60)}”`).join(", ")}`;
      case "page":
        return `Page ${event.url}${event.title ? ` (${event.title})` : ""}`;
      default:
        return event.type;
    }
  }

  function draftHtml(draft) {
    const heading = draft.kind === "bug" ? "Steps to reproduce" : "Acceptance criteria";
    return `
      <div class="draft">
        <div class="kind">${escapeHtml(draft.kind)}</div>
        <h3>${escapeHtml(draft.title)}</h3>
        ${draft.userStory ? `<h4>User story</h4><p>${escapeHtml(draft.userStory)}</p>` : ""}
        ${draft.relatedStory ? `<h4>Related story</h4><p>${escapeHtml(draft.relatedStory)}</p>` : ""}
        ${draft.context ? `<h4>Context</h4><p>${escapeHtml(draft.context)}</p>` : ""}
        <h4>${heading}</h4>
        ${draft.kind === "bug"
          ? `<ol>${draft.acceptanceCriteria.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`
          : `<ul class="checklist">${draft.acceptanceCriteria.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>`}
        ${draft.questions?.length ? `<div class="questions"><h4>Claude asks</h4><ul>${draft.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul></div>` : ""}
      </div>`;
  }

  function picturesHtml(story) {
    const images = story.images || [];
    if (!images.length) return "";
    return `
      <div class="section-title">Pictures (${images.length})</div>
      <div class="pictures">${images.map((image) => `
        <figure>
          <a href="${BASE}/__story-cart/images/${image.file}" target="_blank"><img src="${BASE}/__story-cart/images/${image.file}" alt="${escapeHtml(image.caption)}"></a>
          <figcaption>
            <label title="Attach to the story when publishing"><input type="checkbox" data-attach="${image.id}" ${image.attach ? "checked" : ""}> Attach</label>
            <button class="icon" title="Remove picture" data-action="remove-picture" data-id="${image.id}">✕</button>
          </figcaption>
        </figure>`).join("")}</div>`;
  }

  function notePlaceholder(story) {
    if (story.draft) {
      return "Answer Claude's questions or add a correction";
    } else if (story.events.length) {
      return "Note (optional), e.g. “the role is admin, not member”";
    } else {
      return "Describe the story, e.g. “An admin removes a member from a team”";
    }
  }

  function storyTab() {
    const story = currentStory();
    if (!story) {
      return `
        <p class="hint">Start from the page with <b>Inspect</b> or <b>Record</b>, or describe a story yourself.</p>
        <div class="row">
          <button class="primary" data-action="new-story">Start from the page</button>
          <button data-action="write-story">Write it myself</button>
        </div>`;
    }

    const lastIsInspect = story.events.at(-1)?.type === "inspect" && lastInspected;
    return `
      ${prefs.mode === "inspect" ? `<p class="hint keys">Hover a block · <kbd>↑</kbd> wider · <kbd>↓</kbd> narrower · click to capture · <kbd>Esc</kbd> to stop</p>` : ""}
      <div class="section-title">Captured (${story.events.length})</div>
      ${story.events.length ? `<ul class="events">${story.events.map((event, index) => `
        <li><span>${escapeHtml(eventLabel(event))}</span><button class="icon" title="Remove" data-action="remove-event" data-index="${index}">✕</button></li>`).join("")}</ul>` : `<p class="hint">Nothing yet. Use Inspect or Record on the page.</p>`}
      ${lastIsInspect ? `<button class="link" data-action="widen">Widen last pick to its parent ↑</button>` : ""}
      ${capturing ? `<p class="hint">Capturing picture…</p>` : ""}
      ${picturesHtml(story)}
      ${story.draft ? draftHtml(story.draft) : ""}
      <textarea data-note rows="3" placeholder="${notePlaceholder(story)}">${escapeHtml(pendingNote)}</textarea>
      <div class="row">
        <button class="primary" data-action="draft" ${busy ? "disabled" : ""}>${busy ? "Drafting… (about 20s)" : story.draft ? "Update draft" : "Draft story"}</button>
      </div>
      <div class="row">
        <button data-action="add-to-cart" ${story.draft && !busy ? "" : "disabled"}>Add to cart</button>
        <button class="danger" data-action="discard" ${busy ? "disabled" : ""}>Discard</button>
      </div>`;
  }

  function epicsInOrder() {
    const epics = Object.values(data.epics);
    return [...epics.filter((epic) => epic.noEpic), ...epics.filter((epic) => !epic.noEpic)];
  }

  function cartTab() {
    const cartStories = Object.values(data.stories).filter((story) => story.status === "cart");
    if (!cartStories.length) {
      return `<p class="hint">Your cart is empty. Draft a story and add it to the cart.</p>`;
    }
    const target = data.epics[prefs.target] ? prefs.target : "__new";
    return `
      <ul class="cart">${cartStories.map((story) => `
        <li>
          <label><input type="checkbox" checked data-cart-pick="${story.id}"> ${escapeHtml(story.draft?.title || "Untitled")}</label>
          <span><button class="link" data-action="edit-story" data-id="${story.id}">Edit</button>
          <button class="link danger" data-action="remove-from-cart" data-id="${story.id}">Delete</button></span>
        </li>`).join("")}</ul>
      <div class="section-title">Move selected to</div>
      <select data-target>
        <option value="__new" ${target === "__new" ? "selected" : ""}>A new epic…</option>
        ${epicsInOrder().map((epic) => `<option value="${epic.id}" ${target === epic.id ? "selected" : ""}>${escapeHtml(epic.name)}</option>`).join("")}
      </select>
      ${target === "__new" ? `<input data-epic-name placeholder="Epic name, e.g. Account settings">` : ""}
      <button class="primary" data-action="move-to-epic">Move to epic</button>`;
  }

  function epicsTab() {
    const epics = epicsInOrder();
    const publishedCount = (epic) => epic.storyIds.filter((id) => data.stories[id]?.published).length;
    return `<ul class="cart">${epics.map((epic) => `
      <li><span>${escapeHtml(epic.name)} <span class="muted">(${epic.storyIds.length} stories${publishedCount(epic) ? `, ${publishedCount(epic)} published` : ""})</span></span>
      <a class="link" href="${BASE}/__story-cart/epics/${epic.id}" target="_blank">Review</a></li>`).join("")}</ul>`;
  }

  function render() {
    const cartCount = Object.values(data.stories).filter((story) => story.status === "cart").length;
    const epicCount = Object.keys(data.epics).length;
    const tabs = { story: storyTab, cart: cartTab, epics: epicsTab };
    const scrollTop = shadow.querySelector(".body")?.scrollTop || 0;

    shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="highlight" hidden></div>
      <div class="panel ${prefs.open ? "" : "closed"} mode-${prefs.mode}">
        <header>
          <button class="title" data-action="toggle">Story Cart ${prefs.open ? "▾" : "▸"}</button>
          <div class="modes">
            ${["off", "inspect", "record"].map((mode) => `<button data-action="mode" data-value="${mode}" class="${prefs.mode === mode ? "on" : ""}">${mode[0].toUpperCase() + mode.slice(1)}</button>`).join("")}
            <button data-action="camera" class="camera ${prefs.camera ? "on" : ""}" title="${prefs.camera ? "Pictures on: each Inspect click also captures a picture" : "Pictures off: turn on to capture a picture with each Inspect click"}">📷</button>
          </div>
        </header>
        ${prefs.open ? `
          <nav>
            <button data-action="tab" data-value="story" class="${prefs.tab === "story" ? "on" : ""}">Story</button>
            <button data-action="tab" data-value="cart" class="${prefs.tab === "cart" ? "on" : ""}">Cart (${cartCount})</button>
            <button data-action="tab" data-value="epics" class="${prefs.tab === "epics" ? "on" : ""}">Epics (${epicCount})</button>
          </nav>
          ${errorMessage ? `<div class="error">${escapeHtml(errorMessage)}</div>` : ""}
          <div class="body">${(tabs[prefs.tab] || storyTab)()}</div>` : ""}
      </div>`;
    const body = shadow.querySelector(".body");
    if (body) body.scrollTop = scrollTop;
  }

  function highlight(element) {
    const box = shadow.querySelector(".highlight");
    if (!box) return;
    if (!element) {
      box.hidden = true;
    } else {
      const rect = element.getBoundingClientRect();
      Object.assign(box.style, { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      box.hidden = false;
    }
  }

  shadow.addEventListener("change", async (event) => {
    const box = event.target.closest?.("[data-attach]");
    if (!box) return;
    const story = currentStory();
    try {
      data.stories[story.id] = await api("PATCH", `/stories/${story.id}/images/${box.dataset.attach}`, { attach: box.checked });
    } catch (error) {
      showError(error.message);
    }
  });

  shadow.addEventListener("input", (event) => {
    if (event.target.matches("[data-note]")) pendingNote = event.target.value;
    if (event.target.matches("[data-target]")) {
      prefs.target = event.target.value;
      savePrefs();
      render();
    }
  });

  shadow.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = actions[button.dataset.action];
    if (action) {
      try {
        await action(button);
      } catch (error) {
        showError(error.message);
      }
    }
  });

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    .highlight { position: fixed; pointer-events: none; z-index: 2147483646; border: 2px solid #8250df; background: rgba(130, 80, 223, 0.12); border-radius: 3px; }
    .panel { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 380px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);
      display: flex; flex-direction: column; background: #fff; color: #1f2328; border: 1px solid #d0d7de; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(31, 35, 40, 0.18); font-size: 13px; line-height: 1.45; }
    .panel.mode-inspect { border-color: #8250df; }
    .panel.mode-record { border-color: #cf222e; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #d0d7de; }
    .panel.closed header { border-bottom: 0; }
    .title { font-weight: 600; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; font-size: 13px; }
    .modes, nav { display: flex; gap: 4px; }
    nav { padding: 6px 10px; border-bottom: 1px solid #d0d7de; }
    button { font-size: 12px; padding: 4px 8px; border: 1px solid #d0d7de; background: #f6f8fa; color: #1f2328; border-radius: 6px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: default; }
    .modes button.on[data-value=inspect] { background: #8250df; border-color: #8250df; color: #fff; }
    .modes button.on[data-value=record] { background: #cf222e; border-color: #cf222e; color: #fff; }
    .modes button.on[data-value=off], nav button.on { background: #1f2328; border-color: #1f2328; color: #fff; }
    button.primary { background: #1f883d; border-color: #1f883d; color: #fff; }
    button.danger { color: #cf222e; }
    button.link { background: none; border: 0; padding: 2px 0; color: #0969da; }
    button.link.danger { color: #cf222e; }
    button.icon { background: none; border: 0; padding: 0 4px; color: #656d76; }
    a.link { color: #0969da; text-decoration: none; font-size: 12px; }
    .body { padding: 10px; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
    .body > * { flex-shrink: 0; }
    textarea[data-note] { min-height: 72px; }
    .hint, .muted { color: #656d76; margin: 0; }
    .error { margin: 8px 10px 0; padding: 6px 8px; background: #ffebe9; color: #82071e; border: 1px solid #ff818266; border-radius: 6px; }
    .section-title { font-weight: 600; }
    ul.events, ul.cart { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    ul.events li, ul.cart li { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 4px 6px; background: #f6f8fa; border-radius: 6px; }
    ul.cart label { display: flex; gap: 6px; align-items: flex-start; }
    textarea, input[data-epic-name], select[data-target] { width: 100%; font-size: 13px; padding: 6px 8px; border: 1px solid #d0d7de; border-radius: 6px; resize: vertical; color: #1f2328; background: #fff; }
    .row { display: flex; gap: 6px; }
    .draft { border: 1px solid #d0d7de; border-radius: 8px; padding: 8px 10px; }
    .draft h3 { margin: 2px 0 6px; font-size: 15px; }
    .draft h4 { margin: 8px 0 2px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; color: #656d76; }
    .draft p { margin: 0; }
    .draft ol, .draft ul { margin: 0; padding-left: 20px; }
    .draft ul.checklist { list-style: none; padding-left: 0; }
    .draft ul.checklist li { position: relative; padding-left: 20px; }
    .draft ul.checklist li::before { content: "☐"; position: absolute; left: 0; color: #656d76; }
    .kind { display: inline-block; font-size: 11px; padding: 0 6px; border-radius: 10px; background: #ddf4ff; color: #0969da; }
    .modes button.camera.on { background: #ddf4ff; border-color: #0969da; }
    .pictures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .pictures figure { margin: 0; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; background: #f6f8fa; }
    .pictures img { display: block; width: 100%; height: 72px; object-fit: cover; object-position: top left; background: #fff; }
    .pictures figcaption { display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; font-size: 11px; }
    .pictures label { display: flex; gap: 3px; align-items: center; }
    .keys kbd { font: 11px ui-monospace, Menlo, monospace; padding: 0 4px; border: 1px solid #d0d7de; border-bottom-width: 2px; border-radius: 4px; background: #f6f8fa; color: #1f2328; }
    .questions { margin-top: 8px; padding: 6px 8px; background: #fff8c5; border-radius: 6px; }
  `;

  // ---------- boot ----------

  render();
  refresh().then(() => {
    setMode(prefs.mode);
    if (prefs.mode === "record" && currentStory()) addEvent(pageEvent());
  });
})();
