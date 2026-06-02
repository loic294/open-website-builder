import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";

// Padding presets and helpers (copied from site-section.js — kept private here)
const SECTION_PADDING_PRESETS = {
  none: { top: "0", right: "0", bottom: "0", left: "0" },
  small: { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" },
  medium: { top: "5rem", right: "2rem", bottom: "5rem", left: "2rem" },
  large: { top: "8rem", right: "2rem", bottom: "8rem", left: "2rem" },
};

const RESPONSIVE_BREAKPOINTS = [
  { bucket: "tabletHorizontal", maxWidth: 1180 },
  { bucket: "mobileHorizontal", maxWidth: 844 },
  { bucket: "tabletVertical", maxWidth: 820 },
  { bucket: "mobileVertical", maxWidth: 390 },
];

function getSectionPadding(settings = {}) {
  const preset =
    SECTION_PADDING_PRESETS[settings.settingSizing] ||
    SECTION_PADDING_PRESETS.medium;
  return {
    top: String(settings.settingPaddingTop || preset.top),
    right: String(settings.settingPaddingRight || preset.right),
    bottom: String(settings.settingPaddingBottom || preset.bottom),
    left: String(settings.settingPaddingLeft || preset.left),
  };
}

export function getSectionInlineStyle(settings = {}) {
  const parts = [];
  if (settings.settingBackgroundColor) {
    parts.push(`background-color: var(${settings.settingBackgroundColor})`);
    parts.push(
      `--owb-section-child-background-color: var(${settings.settingBackgroundColor})`,
    );
  }
  if (settings.settingTextColor) {
    parts.push(`color: var(${settings.settingTextColor})`);
    parts.push(
      `--owb-section-child-text-color: var(${settings.settingTextColor})`,
    );
  }
  return parts.join("; ");
}

export function getContainerInlineStyle(settings = {}) {
  const parts = [];
  const mode = String(settings.settingAlignmentMode || "block");
  const width = String(settings.settingWidth || "normal");
  const customWidth = String(settings.settingWidthCustomValue || "").trim();

  if (width === "custom" && customWidth) {
    parts.push(`max-width: ${customWidth}`);
  }

  if (mode === "flex") {
    parts.push("display: flex");
    parts.push(
      `flex-direction: ${String(settings.settingFlexDirection || "row")}`,
    );
    if (settings.settingFlexWrap) {
      parts.push(`flex-wrap: ${String(settings.settingFlexWrap)}`);
    }
    parts.push(
      `justify-content: ${String(settings.settingFlexJustifyContent || "flex-start")}`,
    );
    parts.push(
      `align-items: ${String(settings.settingFlexAlignItems || "flex-start")}`,
    );
    if (settings.settingGap) {
      parts.push(`gap: ${String(settings.settingGap)}`);
    }
  }

  if (mode === "grid" || mode === "visual") {
    const columns = Math.max(
      1,
      Number.parseInt(settings.settingGridColumns, 10) || 2,
    );
    const rows = Math.max(
      1,
      Number.parseInt(settings.settingGridRows, 10) || 2,
    );
    parts.push("display: grid");
    parts.push(`grid-template-columns: repeat(${columns}, minmax(0, 1fr))`);
    if (mode === "visual") {
      const rowSize = String(settings.settingRowHeight || "30px").trim();
      parts.push(`grid-template-rows: repeat(${rows}, ${rowSize})`);
    } else {
      parts.push(`grid-template-rows: repeat(${rows}, auto)`);
    }
    if (settings.settingGap) {
      parts.push(`gap: ${String(settings.settingGap)}`);
    }
    if (mode === "visual") {
      parts.push("justify-items: stretch");
      parts.push("align-items: stretch");
      parts.push("justify-content: stretch");
      parts.push("align-content: stretch");
    } else {
      if (settings.settingGridJustifyContent) {
        parts.push(`justify-content: ${settings.settingGridJustifyContent}`);
      }
      if (settings.settingGridAlignItems) {
        parts.push(`align-items: ${settings.settingGridAlignItems}`);
      }
      if (settings.settingGridAlignContent) {
        parts.push(`align-content: ${settings.settingGridAlignContent}`);
      }
    }
  }

  const padding = getSectionPadding(settings);
  parts.push(`padding-top: ${padding.top}`);
  parts.push(`padding-right: ${padding.right}`);
  parts.push(`padding-bottom: ${padding.bottom}`);
  parts.push(`padding-left: ${padding.left}`);

  if (settings.settingFixedHeight && mode !== "visual") {
    parts.push(`min-height: ${String(settings.settingFixedHeight)}`);
  }

  return parts.join("; ");
}

function buildResponsiveSectionCss(
  settings,
  sectionSelector,
  containerSelector,
) {
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
        `@media (max-width: ${maxWidth}px) { ${sectionSelector} { ${sectionCss} } }`,
      );
    if (containerCss)
      parts.push(
        `@media (max-width: ${maxWidth}px) { ${containerSelector} { ${containerCss} } }`,
      );
    return parts.join(" ");
  })
    .filter(Boolean)
    .join("\n");

  return rules;
}

export class OwbSection extends LitElement {
  static editorPlugin = null;

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
    OwbSection.editorPlugin?.onConnected?.(this);
  }

  disconnectedCallback() {
    OwbSection.editorPlugin?.onDisconnected?.(this);
    super.disconnectedCallback();
  }

  willUpdate(changedProperties) {
    OwbSection.editorPlugin?.onWillUpdate?.(this, changedProperties);
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbSection.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const pluginRender = OwbSection.editorPlugin?.render;
    if (typeof pluginRender === "function") {
      return pluginRender(this);
    }
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
    const responsiveCss = buildResponsiveSectionCss(
      settings,
      "section",
      ".container",
    );

    return html`
      <link rel="stylesheet" href="/owb-styles/site-section.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${spacingCss
        ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
        : null}
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <section style="${getSectionInlineStyle(settings)}">
        <div
          class="container ${widthClass}"
          style="${getContainerInlineStyle(settings)}"
        >
          <slot></slot>
        </div>
      </section>
    `;
  }
}
