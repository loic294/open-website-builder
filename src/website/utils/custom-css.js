import { RESPONSIVE_BREAKPOINTS } from "./responsive.js";

function findClosingBrace(css, openingBraceIndex) {
  let depth = 0;
  let quote = "";

  for (let index = openingBraceIndex; index < css.length; index += 1) {
    const character = css[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return index;
  }

  return -1;
}

export function buildEditorCustomCss(customCss, isEditorMode = false) {
  const css = String(customCss || "").trim();
  if (!css || !isEditorMode) return css;

  const containerRules = [];
  const mediaPattern = /@media\s*\(\s*max-width\s*:\s*([^)]+)\)\s*\{/gi;
  let match;

  while ((match = mediaPattern.exec(css))) {
    const openingBraceIndex = mediaPattern.lastIndex - 1;
    const closingBraceIndex = findClosingBrace(css, openingBraceIndex);
    if (closingBraceIndex === -1) break;

    const maxWidth = match[1].trim();
    const rules = css.slice(openingBraceIndex + 1, closingBraceIndex);
    const numericMaxWidth = Number.parseFloat(maxWidth);
    const breakpointIndex = RESPONSIVE_BREAKPOINTS.findIndex(
      (breakpoint) => breakpoint.maxWidth === numericMaxWidth,
    );
    if (breakpointIndex !== -1) {
      for (const breakpoint of RESPONSIVE_BREAKPOINTS.slice(breakpointIndex)) {
        containerRules.push(
          `@container owb-viewport style(--owb-responsive-bucket: ${breakpoint.bucket}) {${rules}}`,
        );
      }
    }
    mediaPattern.lastIndex = closingBraceIndex + 1;
  }

  return [css, ...containerRules].join("\n");
}
