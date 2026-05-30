/**
 * Shared spacing/common settings utility for Lit components.
 *
 * Converts the "spacing" panel settings (padding, margin, border-radius,
 * background-color, text-color, hidden) into a CSS string that targets
 * the `:host` element, including responsive overrides.
 *
 * Usage in a component's render():
 *   import { getSpacingStyleBlock } from "../../utils/spacing.js";
 *   import { unsafeHTML } from "lit/directives/unsafe-html.js";
 *
 *   render() {
 *     const spacingCss = getSpacingStyleBlock(this.settings ?? {});
 *     return html`
 *       <link rel="stylesheet" href="/owb-styles/my-component.css" />
 *       ${spacingCss ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`) : null}
 *       ...
 *     `;
 *   }
 */

const RESPONSIVE_BREAKPOINTS = [
  { bucket: "tabletHorizontal", maxWidth: 1180 },
  { bucket: "mobileHorizontal", maxWidth: 844 },
  { bucket: "tabletVertical", maxWidth: 820 },
  { bucket: "mobileVertical", maxWidth: 390 },
];

export function getSpacingCss(settings = {}) {
  const props = [
    ["padding-top", settings.settingSpacingPaddingTop],
    ["padding-right", settings.settingSpacingPaddingRight],
    ["padding-bottom", settings.settingSpacingPaddingBottom],
    ["padding-left", settings.settingSpacingPaddingLeft],
    ["margin-top", settings.settingSpacingMarginTop],
    ["margin-right", settings.settingSpacingMarginRight],
    ["margin-bottom", settings.settingSpacingMarginBottom],
    ["margin-left", settings.settingSpacingMarginLeft],
    ["border-radius", settings.settingSpacingBorderRadius],
  ];
  const parts = props
    .filter(([, v]) => String(v || "").trim())
    .map(([p, v]) => `${p}: ${v}`);

  if (settings.settingSpacingBackgroundColor) {
    parts.push(
      `background-color: var(${settings.settingSpacingBackgroundColor})`,
    );
  }
  if (settings.settingSpacingTextColor) {
    parts.push(`color: var(${settings.settingSpacingTextColor})`);
  }
  if (settings.settingSpacingHidden) {
    parts.push("display: none !important");
  }

  return parts.length ? `:host { ${parts.join("; ")} }` : "";
}

export function buildResponsiveSpacingCss(settings = {}) {
  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";

  const rules = RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }) => {
    const bucketOverrides = overrides[bucket];
    if (!bucketOverrides || typeof bucketOverrides !== "object") return "";
    const merged = { ...settings, ...bucketOverrides };
    const css = getSpacingCss(merged);
    if (!css) return "";
    const important = css.replace(/:host \{([^}]+)\}/, (_, decls) => {
      const importantDecls = decls
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => `${d} !important`)
        .join("; ");
      return `@media (max-width: ${maxWidth}px) { :host { ${importantDecls} } }`;
    });
    return important;
  })
    .filter(Boolean)
    .join("\n");

  return rules;
}

/**
 * Returns the combined base + responsive spacing CSS string for injection as
 * a `<style data-spacing>` block inside the component shadow DOM.
 * Returns an empty string if no spacing settings are set.
 */
export function getSpacingStyleBlock(settings = {}) {
  const base = getSpacingCss(settings);
  const responsive = buildResponsiveSpacingCss(settings);
  return [base, responsive].filter(Boolean).join("\n");
}
