export const RESPONSIVE_BREAKPOINTS = Object.freeze([
  Object.freeze({ bucket: "tabletHorizontal", maxWidth: 1180 }),
  Object.freeze({ bucket: "mobileHorizontal", maxWidth: 844 }),
  Object.freeze({ bucket: "tabletVertical", maxWidth: 820 }),
  Object.freeze({ bucket: "mobileVertical", maxWidth: 440 }),
]);

export const RESPONSIVE_BUCKET_ORDER = Object.freeze(
  RESPONSIVE_BREAKPOINTS.map(({ bucket }) => bucket),
);

function getBaseSettings(settings = {}) {
  const { responsiveOverrides: _responsiveOverrides, ...baseSettings } =
    settings;
  return baseSettings;
}

export function getEffectiveSettings(settings = {}, bucket = null) {
  const effectiveSettings = getBaseSettings(settings);
  if (!bucket) return effectiveSettings;

  const bucketIndex = RESPONSIVE_BUCKET_ORDER.indexOf(bucket);
  if (bucketIndex === -1) return effectiveSettings;

  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return effectiveSettings;

  for (let index = 0; index <= bucketIndex; index += 1) {
    const bucketOverrides = overrides[RESPONSIVE_BUCKET_ORDER[index]];
    if (bucketOverrides && typeof bucketOverrides === "object") {
      Object.assign(effectiveSettings, bucketOverrides);
    }
  }

  return effectiveSettings;
}

export function normalizeCssDeclarations(declarations, important = false) {
  const entries = Array.isArray(declarations)
    ? declarations
    : Object.entries(declarations || {}).map(
        ([property, value]) => `${property}: ${value}`,
      );

  return entries
    .map((declaration) =>
      String(declaration || "")
        .trim()
        .replace(/;$/, ""),
    )
    .filter(Boolean)
    .map((declaration) =>
      important && !/!important\s*$/i.test(declaration)
        ? `${declaration} !important`
        : declaration,
    )
    .join("; ");
}

export function buildResponsiveCss(settings = {}, renderRules) {
  if (typeof renderRules !== "function") return "";

  const overrides = settings.responsiveOverrides;
  if (!overrides || typeof overrides !== "object") return "";

  return RESPONSIVE_BREAKPOINTS.map(({ bucket, maxWidth }, breakpointIndex) => {
    const bucketOverrides = overrides[bucket];
    if (
      !bucketOverrides ||
      typeof bucketOverrides !== "object" ||
      Object.keys(bucketOverrides).length === 0
    ) {
      return "";
    }

    const rules = renderRules(getEffectiveSettings(settings, bucket), bucket);
    const cssRules = (Array.isArray(rules) ? rules : [rules])
      .filter(Boolean)
      .map(({ selector, declarations, important = true }) => {
        const css = normalizeCssDeclarations(declarations, important);
        return selector && css ? `${selector} { ${css} }` : "";
      })
      .filter(Boolean)
      .join(" ");

    if (!cssRules) return "";

    const editorRules = RESPONSIVE_BREAKPOINTS.slice(breakpointIndex)
      .map(
        ({ bucket: activeBucket }) =>
          `@container owb-viewport style(--owb-responsive-bucket: ${activeBucket}) { ${cssRules} }`,
      )
      .join("\n");

    return `@media (max-width: ${maxWidth}px) { ${cssRules} }\n${editorRules}`;
  })
    .filter(Boolean)
    .join("\n");
}
