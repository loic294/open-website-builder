import { buildResponsiveCss } from "./responsive.js";

export const SECTION_PADDING_PRESETS = Object.freeze({
  none: Object.freeze({ top: "0", right: "0", bottom: "0", left: "0" }),
  small: Object.freeze({
    top: "2rem",
    right: "2rem",
    bottom: "2rem",
    left: "2rem",
  }),
  medium: Object.freeze({
    top: "5rem",
    right: "2rem",
    bottom: "5rem",
    left: "2rem",
  }),
  large: Object.freeze({
    top: "8rem",
    right: "2rem",
    bottom: "8rem",
    left: "2rem",
  }),
});

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

export function getSectionDeclarations(settings = {}) {
  const declarations = [];
  if (settings.settingBackgroundColor) {
    declarations.push(
      `background-color: var(${settings.settingBackgroundColor})`,
      `--owb-section-child-background-color: var(${settings.settingBackgroundColor})`,
    );
  }
  if (settings.settingTextColor) {
    declarations.push(
      `color: var(${settings.settingTextColor})`,
      `--owb-section-child-text-color: var(${settings.settingTextColor})`,
    );
  }
  return declarations;
}

export function getContainerDeclarations(settings = {}) {
  const declarations = [];
  const mode = String(settings.settingAlignmentMode || "block");
  const width = String(settings.settingWidth || "normal");
  const customWidth = String(settings.settingWidthCustomValue || "").trim();

  if (width === "full") declarations.push("max-width: 100%");
  if (width === "normal") declarations.push("max-width: 960px");
  if (width === "custom" && customWidth) {
    declarations.push(`max-width: ${customWidth}`);
  }

  if (mode === "block") declarations.push("display: block");

  if (mode === "flex") {
    declarations.push(
      "display: flex",
      `flex-direction: ${String(settings.settingFlexDirection || "row")}`,
      `flex-wrap: ${String(settings.settingFlexWrap || "nowrap")}`,
      `justify-content: ${String(settings.settingFlexJustifyContent || "flex-start")}`,
      `align-items: ${String(settings.settingFlexAlignItems || "flex-start")}`,
      `align-content: ${String(settings.settingFlexAlignContent || "stretch")}`,
    );
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
    const rowSize =
      mode === "visual"
        ? String(settings.settingRowHeight || "30px").trim()
        : "auto";
    declarations.push(
      "display: grid",
      `grid-template-columns: repeat(${columns}, minmax(0, 1fr))`,
      `grid-template-rows: repeat(${rows}, ${rowSize})`,
      `justify-items: ${
        mode === "visual"
          ? "stretch"
          : String(settings.settingGridJustifyItems || "start")
      }`,
      `align-items: ${
        mode === "visual"
          ? "stretch"
          : String(settings.settingGridAlignItems || "start")
      }`,
      `justify-content: ${
        mode === "visual"
          ? "stretch"
          : String(settings.settingGridJustifyContent || "start")
      }`,
      `align-content: ${
        mode === "visual"
          ? "stretch"
          : String(settings.settingGridAlignContent || "start")
      }`,
    );
  }

  if (settings.settingGap && mode !== "block") {
    const gap = String(settings.settingGap);
    if (mode === "grid" || mode === "visual") {
      const columns = Math.max(
        1,
        Number.parseInt(settings.settingGridColumns, 10) || 2,
      );
      declarations.push(
        `row-gap: ${gap}`,
        `column-gap: min(${gap}, calc(100% / ${columns}))`,
      );
    } else {
      declarations.push(`gap: ${gap}`);
    }
  }

  const padding = getSectionPadding(settings);
  declarations.push(
    `padding-top: ${padding.top}`,
    `padding-right: ${padding.right}`,
    `padding-bottom: ${padding.bottom}`,
    `padding-left: ${padding.left}`,
  );

  if (settings.settingFixedHeight && mode !== "visual") {
    declarations.push(`min-height: ${String(settings.settingFixedHeight)}`);
  }

  return declarations;
}

export function getSectionInlineStyle(settings = {}) {
  return getSectionDeclarations(settings).join("; ");
}

export function getContainerInlineStyle(settings = {}) {
  return getContainerDeclarations(settings).join("; ");
}

export function buildResponsiveLayoutCss(
  settings,
  sectionSelector,
  containerSelector,
) {
  return buildResponsiveCss(settings, (effectiveSettings) => [
    {
      selector: sectionSelector,
      declarations: getSectionDeclarations(effectiveSettings),
    },
    {
      selector: containerSelector,
      declarations: getContainerDeclarations(effectiveSettings),
    },
  ]);
}
