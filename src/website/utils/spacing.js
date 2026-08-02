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
import { buildResponsiveCss } from "./responsive.js";

function getSpacingDeclarations(settings = {}) {
  const declarations = [
    ["padding-top", settings.settingSpacingPaddingTop],
    ["padding-right", settings.settingSpacingPaddingRight],
    ["padding-bottom", settings.settingSpacingPaddingBottom],
    ["padding-left", settings.settingSpacingPaddingLeft],
    ["margin-top", settings.settingSpacingMarginTop],
    ["margin-right", settings.settingSpacingMarginRight],
    ["margin-bottom", settings.settingSpacingMarginBottom],
    ["margin-left", settings.settingSpacingMarginLeft],
    ["border-radius", settings.settingSpacingBorderRadius],
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([property, value]) => `${property}: ${value}`);

  if (settings.settingSpacingBackgroundColor) {
    declarations.push(
      `background-color: var(${settings.settingSpacingBackgroundColor})`,
    );
  }
  if (settings.settingSpacingTextColor) {
    declarations.push(`color: var(${settings.settingSpacingTextColor})`);
  }
  if (settings.settingSpacingHidden) {
    declarations.push("display: none !important");
  }

  return declarations;
}

export function getSpacingCss(settings = {}) {
  const declarations = getSpacingDeclarations(settings);
  return declarations.length ? `:host { ${declarations.join("; ")} }` : "";
}

export function buildResponsiveSpacingCss(settings = {}) {
  return buildResponsiveCss(settings, (effectiveSettings) => ({
    selector: ":host",
    declarations: getSpacingDeclarations(effectiveSettings),
  }));
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
