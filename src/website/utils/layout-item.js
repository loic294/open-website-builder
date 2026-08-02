import { buildResponsiveCss } from "./responsive.js";

export const GRID_PLACEMENT_KEYS = Object.freeze({
  columnStart: "gridColumnStart",
  rowStart: "gridRowStart",
  columnSpan: "gridColumnSpan",
  rowSpan: "gridRowSpan",
});

function positiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getLayoutItemDeclarations(settings = {}) {
  const declarations = [];
  const columnStart = positiveInteger(settings.gridColumnStart);
  const rowStart = positiveInteger(settings.gridRowStart);
  const columnSpan = positiveInteger(settings.gridColumnSpan);
  const rowSpan = positiveInteger(settings.gridRowSpan);

  if (columnStart && columnSpan) {
    declarations.push(`grid-column: ${columnStart} / span ${columnSpan}`);
  }
  if (rowStart && rowSpan) {
    declarations.push(`grid-row: ${rowStart} / span ${rowSpan}`);
  }

  const optionalProperties = [
    ["order", settings.flexOrder ?? settings.order],
    ["flex-grow", settings.flexGrow],
    ["flex-shrink", settings.flexShrink],
    ["flex-basis", settings.flexBasis],
    ["align-self", settings.alignSelf],
    ["justify-self", settings.justifySelf],
    ["grid-column-start", settings.gridColumnStartValue],
    ["grid-column-end", settings.gridColumnEnd],
    ["grid-row-start", settings.gridRowStartValue],
    ["grid-row-end", settings.gridRowEnd],
    ["grid-area", settings.gridArea],
  ];

  for (const [property, value] of optionalProperties) {
    if (value !== undefined && value !== null && String(value).trim()) {
      declarations.push(`${property}: ${String(value).trim()}`);
    }
  }

  return declarations;
}

export function buildResponsiveLayoutItemCss(settings, selector) {
  return buildResponsiveCss(settings, (effectiveSettings) => ({
    selector,
    declarations: getLayoutItemDeclarations(effectiveSettings),
  }));
}
