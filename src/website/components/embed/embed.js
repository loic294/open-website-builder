import { LitElement, html } from "lit";
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
  };

  constructor() {
    super();
    this.html = "";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
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
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbEmbed.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const safeHtml = sanitizeEmbedHtml(this.html ?? "");
    const settings = this.settings ?? {};
    const spacingCss = getSpacingStyleBlock(settings);
    return html`
      <link rel="stylesheet" href="/owb-styles/embed.css" />
      ${spacingCss ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`) : null}
      ${safeHtml.trim()
        ? html`<div class="embed-preview">${unsafeHTML(safeHtml)}</div>`
        : html`<div class="embed-placeholder">No embed content</div>`}
    `;
  }
}
