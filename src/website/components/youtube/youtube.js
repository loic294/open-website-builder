import { LitElement, html, nothing } from "lit";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export const defaultYoutubeConfig = {
  type: "youtube",
  settings: {
    settingVideoId: "",
    settingListId: "",
    settingListType: "",
    settingAspectRatio: "16:9",
    settingAutoplay: false,
    settingControls: true,
    settingLoop: false,
    settingStart: "",
    settingEnd: "",
    settingPlaysinline: false,
    settingColor: "red",
    settingFs: true,
    settingIvLoadPolicy: true,
    settingCcLoadPolicy: false,
    settingCcLangPref: "",
    settingHl: "",
    settingDisablekb: false,
    settingRel: false,
    settingEnablejsapi: false,
    settingOrigin: "",
    settingWidgetReferrer: "",
  },
};

const VALID_LIST_TYPES = new Set(["", "playlist", "user_uploads"]);
const VALID_COLORS = new Set(["red", "white"]);
const VALID_ASPECT_RATIOS = new Set(["16:9", "4:3", "1:1", "9:16", "21:9"]);

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

function toNonNegativeInt(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(n);
}

function sanitizeId(value) {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_\-]/g, "");
}

function sanitizeYoutubeUrlInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Try parsing common YouTube URL shapes, fall back to raw.
  const idMatch =
    raw.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/,
    ) || null;
  if (idMatch) return idMatch[1];
  return sanitizeId(raw);
}

function aspectRatioToCss(ratio) {
  if (!VALID_ASPECT_RATIOS.has(ratio)) return "16 / 9";
  return ratio.replace(":", " / ");
}

export function buildYoutubeEmbedUrl(settings = {}) {
  const videoId = sanitizeId(settings.settingVideoId);
  const listIdRaw = String(settings.settingListId || "").trim();
  const listId = listIdRaw.replace(/[^A-Za-z0-9_\-]/g, "");
  const listType = VALID_LIST_TYPES.has(settings.settingListType)
    ? settings.settingListType
    : "";

  const params = new URLSearchParams();

  if (toBool(settings.settingAutoplay)) params.set("autoplay", "1");
  if (
    settings.settingControls === false ||
    String(settings.settingControls) === "false"
  ) {
    params.set("controls", "0");
  }
  if (toBool(settings.settingLoop)) params.set("loop", "1");

  const start = toNonNegativeInt(settings.settingStart);
  if (start) params.set("start", start);
  const end = toNonNegativeInt(settings.settingEnd);
  if (end) params.set("end", end);

  if (toBool(settings.settingPlaysinline)) params.set("playsinline", "1");

  const color = VALID_COLORS.has(settings.settingColor)
    ? settings.settingColor
    : "red";
  if (color === "white") params.set("color", "white");

  if (settings.settingFs === false || String(settings.settingFs) === "false") {
    params.set("fs", "0");
  }

  if (
    settings.settingIvLoadPolicy === false ||
    String(settings.settingIvLoadPolicy) === "false"
  ) {
    params.set("iv_load_policy", "3");
  }

  if (toBool(settings.settingCcLoadPolicy)) params.set("cc_load_policy", "1");

  const ccLangPref = String(settings.settingCcLangPref || "").trim();
  if (ccLangPref) params.set("cc_lang_pref", ccLangPref);

  const hl = String(settings.settingHl || "").trim();
  if (hl) params.set("hl", hl);

  if (toBool(settings.settingDisablekb)) params.set("disablekb", "1");

  if (toBool(settings.settingRel)) params.set("rel", "1");

  if (toBool(settings.settingEnablejsapi)) params.set("enablejsapi", "1");

  const origin = String(settings.settingOrigin || "").trim();
  if (origin) params.set("origin", origin);

  const widgetReferrer = String(settings.settingWidgetReferrer || "").trim();
  if (widgetReferrer) params.set("widget_referrer", widgetReferrer);

  let baseUrl = "";
  if (listType === "playlist" && listId) {
    baseUrl = "https://www.youtube.com/embed/videoseries";
    params.set("list", listId);
  } else if (listType === "user_uploads" && listId) {
    baseUrl = "https://www.youtube.com/embed";
    params.set("listType", "user_uploads");
    params.set("list", listId);
  } else if (videoId) {
    baseUrl = `https://www.youtube.com/embed/${videoId}`;
    if (toBool(settings.settingLoop) && !params.has("playlist")) {
      // Looping a single video requires the playlist param.
      params.set("playlist", videoId);
    }
    if (listId) {
      params.set("list", listId);
    }
  } else {
    return "";
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export class OwbYoutube extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    settingVideoId: { type: String },
    settingListId: { type: String },
    settingListType: { type: String },
    settingAspectRatio: { type: String },
    settingAutoplay: { type: Boolean },
    settingControls: { type: Boolean },
    settingLoop: { type: Boolean },
    settingStart: { type: String },
    settingEnd: { type: String },
    settingPlaysinline: { type: Boolean },
    settingColor: { type: String },
    settingFs: { type: Boolean },
    settingIvLoadPolicy: { type: Boolean },
    settingCcLoadPolicy: { type: Boolean },
    settingCcLangPref: { type: String },
    settingHl: { type: String },
    settingDisablekb: { type: Boolean },
    settingRel: { type: Boolean },
    settingEnablejsapi: { type: Boolean },
    settingOrigin: { type: String },
    settingWidgetReferrer: { type: String },
    settings: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingVideoId = "";
    this.settingListId = "";
    this.settingListType = "";
    this.settingAspectRatio = "16:9";
    this.settingAutoplay = false;
    this.settingControls = true;
    this.settingLoop = false;
    this.settingStart = "";
    this.settingEnd = "";
    this.settingPlaysinline = false;
    this.settingColor = "red";
    this.settingFs = true;
    this.settingIvLoadPolicy = true;
    this.settingCcLoadPolicy = false;
    this.settingCcLangPref = "";
    this.settingHl = "";
    this.settingDisablekb = false;
    this.settingRel = false;
    this.settingEnablejsapi = false;
    this.settingOrigin = "";
    this.settingWidgetReferrer = "";
    this.settings = {};
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        const s = props?.settings;
        if (s && typeof s === "object") {
          this._hydrateFromSettings(s);
          this.settings = s;
        }
      } catch (e) {}
    }
    super.connectedCallback();
    if (OwbYoutube.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbYoutube.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbYoutube.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbYoutube.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  _hydrateFromSettings(s) {
    if (s.settingVideoId !== undefined)
      this.settingVideoId = String(s.settingVideoId);
    if (s.settingListId !== undefined)
      this.settingListId = String(s.settingListId);
    if (s.settingListType !== undefined)
      this.settingListType = String(s.settingListType);
    if (s.settingAspectRatio !== undefined)
      this.settingAspectRatio = String(s.settingAspectRatio);
    if (s.settingAutoplay !== undefined)
      this.settingAutoplay = toBool(s.settingAutoplay);
    if (s.settingControls !== undefined)
      this.settingControls = toBool(s.settingControls);
    if (s.settingLoop !== undefined) this.settingLoop = toBool(s.settingLoop);
    if (s.settingStart !== undefined)
      this.settingStart = String(s.settingStart);
    if (s.settingEnd !== undefined) this.settingEnd = String(s.settingEnd);
    if (s.settingPlaysinline !== undefined)
      this.settingPlaysinline = toBool(s.settingPlaysinline);
    if (s.settingColor !== undefined)
      this.settingColor = String(s.settingColor);
    if (s.settingFs !== undefined) this.settingFs = toBool(s.settingFs);
    if (s.settingIvLoadPolicy !== undefined)
      this.settingIvLoadPolicy = toBool(s.settingIvLoadPolicy);
    if (s.settingCcLoadPolicy !== undefined)
      this.settingCcLoadPolicy = toBool(s.settingCcLoadPolicy);
    if (s.settingCcLangPref !== undefined)
      this.settingCcLangPref = String(s.settingCcLangPref);
    if (s.settingHl !== undefined) this.settingHl = String(s.settingHl);
    if (s.settingDisablekb !== undefined)
      this.settingDisablekb = toBool(s.settingDisablekb);
    if (s.settingRel !== undefined) this.settingRel = toBool(s.settingRel);
    if (s.settingEnablejsapi !== undefined)
      this.settingEnablejsapi = toBool(s.settingEnablejsapi);
    if (s.settingOrigin !== undefined)
      this.settingOrigin = String(s.settingOrigin);
    if (s.settingWidgetReferrer !== undefined)
      this.settingWidgetReferrer = String(s.settingWidgetReferrer);
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.dispatchEvent(
      new CustomEvent("page-config-updated", {
        detail: nextPageConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbYoutube.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  _currentSettings() {
    return {
      settingVideoId: this.settingVideoId,
      settingListId: this.settingListId,
      settingListType: this.settingListType,
      settingAspectRatio: this.settingAspectRatio,
      settingAutoplay: this.settingAutoplay,
      settingControls: this.settingControls,
      settingLoop: this.settingLoop,
      settingStart: this.settingStart,
      settingEnd: this.settingEnd,
      settingPlaysinline: this.settingPlaysinline,
      settingColor: this.settingColor,
      settingFs: this.settingFs,
      settingIvLoadPolicy: this.settingIvLoadPolicy,
      settingCcLoadPolicy: this.settingCcLoadPolicy,
      settingCcLangPref: this.settingCcLangPref,
      settingHl: this.settingHl,
      settingDisablekb: this.settingDisablekb,
      settingRel: this.settingRel,
      settingEnablejsapi: this.settingEnablejsapi,
      settingOrigin: this.settingOrigin,
      settingWidgetReferrer: this.settingWidgetReferrer,
    };
  }

  render() {
    const settings = this._currentSettings();
    const url = buildYoutubeEmbedUrl(settings);
    const isEditorMode = OwbYoutube.editorPlugin !== null;
    const aspectCss = aspectRatioToCss(this.settingAspectRatio);
    const spacingCss = getSpacingStyleBlock(this.settings || {});

    return html`
      <link rel="stylesheet" href="/owb-styles/youtube.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      <div
        class="youtube-block${isEditorMode && this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        style="aspect-ratio: ${aspectCss};"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbYoutube.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${url
          ? html`<iframe
              class="youtube-iframe"
              src=${url}
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
              loading="lazy"
            ></iframe>`
          : html`<div class="youtube-placeholder">
              Add a YouTube video ID or playlist ID
            </div>`}
        ${isEditorMode && url
          ? html`<div class="youtube-editor-overlay" aria-hidden="true"></div>`
          : null}
      </div>
    `;
  }
}
