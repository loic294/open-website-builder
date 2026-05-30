import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export const defaultTextConfig = {
  type: "text",
  content: "<p>This is a default text</p>",
};

function normalizeTextLinksToSameTab(rawHtml) {
  const raw = String(rawHtml ?? "");
  try {
    const template = document.createElement("template");
    if (!template.content?.querySelectorAll) {
      return raw;
    }
    template.innerHTML = raw;
    const anchors = template.content.querySelectorAll("a");
    anchors.forEach((anchor) => {
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
    });
    return template.innerHTML;
  } catch {
    return raw;
  }
}

export class OwbText extends LitElement {
  static editorPlugin = null;

  static properties = {
    content: { type: String },
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.content = "";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbText.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const content = this.content ?? "";
    const settings = this.settings ?? {};
    const customCss = String(settings.customCss || "").trim();
    const normalizedContent = normalizeTextLinksToSameTab(content);
    return html`
      <link rel="stylesheet" href="/owb-styles/text.css" />
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div class="text-block ProseMirror">${unsafeHTML(normalizedContent)}</div>
    `;
  }
}
