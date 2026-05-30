import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";

export const defaultEmbedConfig = {
  type: "embed",
  html: "",
};

export function sanitizeEmbedHtml(rawHtml) {
  const raw = String(rawHtml || "");
  try {
    if (typeof DOMParser === "undefined") {
      return raw;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    doc.querySelectorAll("script").forEach((s) => s.remove());
    doc.querySelectorAll("*").forEach((node) => {
      node.getAttributeNames().forEach((attr) => {
        const lower = attr.toLowerCase();
        const value = String(node.getAttribute(attr) || "").trim();
        if (lower.startsWith("on")) {
          node.removeAttribute(attr);
          return;
        }
        if (
          (lower === "href" || lower === "src") &&
          /^javascript:/i.test(value)
        ) {
          node.removeAttribute(attr);
          return;
        }
        if (lower === "srcdoc") {
          node.removeAttribute(attr);
        }
      });
    });
    return doc.body.innerHTML;
  } catch {
    return raw;
  }
}

export class OwbEmbed extends LitElement {
  static editorPlugin = null;

  static properties = {
    html: { type: String },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.html = "";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.html !== undefined) this.html = props.html;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    if (OwbEmbed.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbEmbed.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbEmbed.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbEmbed.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
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
    OwbEmbed.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const safeHtml = sanitizeEmbedHtml(this.html ?? "");
    const settings = this.settings ?? {};
    const spacingCss = getSpacingStyleBlock(settings);
    const isEditorMode = OwbEmbed.editorPlugin !== null;
    return html`
      <link rel="stylesheet" href="/owb-styles/embed.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      <div
        class="embed-block${this.isSettingsOpen ? " is-settings-open" : ""}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbEmbed.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${safeHtml.trim()
          ? html`<div class="embed-preview">${unsafeHTML(safeHtml)}</div>`
          : html`<div class="embed-placeholder">No embed content</div>`}
      </div>
    `;
  }
}
