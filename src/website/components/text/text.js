import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";

export const defaultTextConfig = {
  type: "text",
  content: "<p>This is a default text</p>",
};

function normalizeTextLinksToSameTab(rawHtml) {
  const raw = String(rawHtml ?? "");
  return raw.replace(/<a\b[^>]*>/gi, (tag) =>
    tag
      .replace(/\s+target\s*=\s*"[^"]*"/gi, "")
      .replace(/\s+target\s*=\s*'[^']*'/gi, "")
      .replace(/\s+target\s*=\s*[^\s>]+/gi, "")
      .replace(/\s+rel\s*=\s*"[^"]*"/gi, "")
      .replace(/\s+rel\s*=\s*'[^']*'/gi, "")
      .replace(/\s+rel\s*=\s*[^\s>]+/gi, ""),
  );
}

export class OwbText extends LitElement {
  static editorPlugin = null;

  static properties = {
    content: { type: String },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.content = "";
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
        if (props.content !== undefined) this.content = props.content;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
    if (OwbText.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbText.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbText.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbText.editorPlugin.onDisconnected?.(this);
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
    OwbText.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const content = this.content ?? "";
    const settings = this.settings ?? {};
    const customCss = String(settings.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const normalizedContent = normalizeTextLinksToSameTab(content);
    const isEditorMode = OwbText.editorPlugin !== null;
    return html`
      <link rel="stylesheet" href="/owb-styles/text.css" />
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="text-block ProseMirror${isEditorMode && this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${isEditorMode
          ? () => OwbText.editorPlugin?.onPointerDown?.(this)
          : nothing}
      >
        ${unsafeHTML(normalizedContent)}
      </div>
    `;
  }
}
