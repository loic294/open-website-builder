import { LitElement, html, css } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import {
  getSectionInlineStyle,
  getContainerInlineStyle,
} from "../site-section/section.js";

export const defaultContainerConfig = {
  type: "container",
  content: [],
};

// Responsive breakpoints for container media queries
const RESPONSIVE_BREAKPOINTS = [
  { bucket: "tabletHorizontal", maxWidth: 1180 },
  { bucket: "mobileHorizontal", maxWidth: 844 },
  { bucket: "tabletVertical", maxWidth: 820 },
  { bucket: "mobileVertical", maxWidth: 390 },
];

function buildResponsiveContainerCss(settings) {
  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";

  const rules = RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }) => {
    const bucketOverrides = overrides[bucket];
    if (
      !bucketOverrides ||
      typeof bucketOverrides !== "object" ||
      Object.keys(bucketOverrides).length === 0
    ) {
      return "";
    }
    const merged = { ...settings, ...bucketOverrides };
    const sectionCss = getSectionInlineStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const containerCss = getContainerInlineStyle(merged)
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `${p} !important`)
      .join("; ");
    const parts = [];
    if (sectionCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { .container { ${sectionCss} } }`,
      );
    if (containerCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { .container { ${containerCss} } }`,
      );
    return parts.join(" ");
  })
    .filter(Boolean)
    .join("\n");

  return rules;
}

export class OwbContainer extends LitElement {
  static editorPlugin = null;

  static styles = css`
    :host {
      display: block;
    }
    .container {
      position: relative;
      padding: var(--section-padding-top, 7rem)
        var(--section-padding-right, 2rem) var(--section-padding-bottom, 6rem)
        var(--section-padding-left, 2rem);
      margin: 0 auto;
    }
    .container.is-normal-width {
      max-width: 960px;
    }
    .container.is-full-width {
      max-width: 100%;
    }
  `;

  static properties = {
    settings: { type: Object },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbContainer.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const settings = this.settings || {};
    const customCss = String(settings.customCss || "").trim();
    const spacingCss = getSpacingStyleBlock(settings);
    const width = String(settings.settingWidth || "normal");
    const widthClass =
      width === "full"
        ? "is-full-width"
        : width === "custom"
          ? ""
          : "is-normal-width";
    const responsiveCss = buildResponsiveContainerCss(settings);

    return html`
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${spacingCss ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`) : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="container ${widthClass}"
        style="${getSectionInlineStyle(settings)}; ${getContainerInlineStyle(
          settings,
        )}"
      >
        <slot></slot>
      </div>
    `;
  }
}
