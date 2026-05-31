import { html } from "lit";
import { ArrowDown, ArrowUp, Trash, Move, Plus, createElement } from "lucide";
import { dataLayer } from "../../../editor/data/data-layer.js";
import {
  SettingsController,
  SETTINGS_HOST_PROPERTIES,
  initSettingsHostState,
  getActiveSettingsOwner,
} from "../../../editor/components/layout/editor-component/settings-controller.js";

const GRID_SETTINGS_KEYS = {
  columnStart: "gridColumnStart",
  rowStart: "gridRowStart",
  columnSpan: "gridColumnSpan",
  rowSpan: "gridRowSpan",
};

const GRID_EDITOR_ROW_SIZE = 30;
const GRID_HANDLE_HOVER_PADDING = 16;

export const SECTION_PADDING_PRESETS = {
  none: { top: "0", right: "0", bottom: "0", left: "0" },
  small: { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" },
  medium: { top: "5rem", right: "2rem", bottom: "5rem", left: "2rem" },
  large: { top: "8rem", right: "2rem", bottom: "8rem", left: "2rem" },
};

export const BLOCK_INSERT_OPTIONS = [
  { label: "Text", value: "text" },
  { label: "Input", value: "input" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Captcha", value: "captcha" },
  { label: "Image", value: "image" },
  { label: "Button", value: "button" },
  { label: "Embed", value: "embed" },
  { label: "Container", value: "container" },
  { label: "Form", value: "form" },
  { label: "Social media", value: "social-media" },
  { label: "Gallery", value: "gallery" },
  { label: "Slider", value: "slider" },
  { label: "Navbar", value: "navbar" },
  { label: "Collection", value: "collection" },
  { label: "Collection content", value: "collection-content" },
  { label: "Shared component", value: "shared" },
];

export const DESIGN_COLOR_VARIABLES = [
  "--website-primary-color",
  "--website-secondary-color",
  "--website-light-color",
  "--website-dark-color",
  "--website-muted-color",
  "--website-neutral-color",
  "--website-background-light-color",
  "--website-background-dark-color",
  "--website-text-light-color",
  "--website-text-dark-color",
  "--website-text-neutral-color",
  "--website-text-muted-color",
  "--website-success-color",
  "--website-danger-color",
  "--website-warning-color",
  "--website-info-color",
];

export function getDefaultLayoutSettingsState() {
  return {
    settingWidth: "normal",
    settingWidthCustomValue: "",
    settingBackgroundColor: "",
    settingTextColor: "",
    settingAlignmentMode: "block",
    settingGap: "",
    settingRowHeight: `${GRID_EDITOR_ROW_SIZE}px`,
    settingFixedHeight: "",
    settingSizing: "medium",
    settingPaddingTop: "",
    settingPaddingBottom: "",
    settingPaddingLeft: "",
    settingPaddingRight: "",
    settingFlexDirection: "row",
    settingFlexHorizontal: "start",
    settingFlexVertical: "start",
    settingFlexJustifyContent: "flex-start",
    settingFlexAlignItems: "flex-start",
    settingFlexAlignContent: "stretch",
    settingGridRows: 2,
    settingGridColumns: 2,
    settingGridHorizontal: "start",
    settingGridVertical: "start",
    settingGridJustifyItems: "start",
    settingGridAlignItems: "start",
    settingGridJustifyContent: "start",
    settingGridAlignContent: "start",
    settingOtherAlignment: "block",
  };
}

function createNodeId(type) {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function updateNodeContentById(nodes, targetNodeId, nextContent) {
  let didChange = false;
  const nextNodes = nodes.map((currentNode) => {
    if (!currentNode || typeof currentNode !== "object") return currentNode;
    if (currentNode.id === targetNodeId) {
      didChange = true;
      return { ...currentNode, content: nextContent };
    }
    if (Array.isArray(currentNode.content)) {
      const nested = updateNodeContentById(
        currentNode.content,
        targetNodeId,
        nextContent,
      );
      if (nested.didChange) {
        didChange = true;
        return { ...currentNode, content: nested.nextNodes };
      }
    }
    return currentNode;
  });
  return { nextNodes, didChange };
}

function updateNodeSettingsById(nodes, targetNodeId, settingsUpdater) {
  let didChange = false;
  const nextNodes = nodes.map((currentNode) => {
    if (!currentNode || typeof currentNode !== "object") return currentNode;
    if (currentNode.id === targetNodeId) {
      const currentSettings =
        currentNode.settings && typeof currentNode.settings === "object"
          ? currentNode.settings
          : {};
      const nextSettings = settingsUpdater(currentSettings);
      if (nextSettings === currentSettings) return currentNode;
      didChange = true;
      const nextNode = { ...currentNode };
      if (nextSettings && Object.keys(nextSettings).length > 0) {
        nextNode.settings = nextSettings;
      } else {
        delete nextNode.settings;
      }
      return nextNode;
    }
    if (Array.isArray(currentNode.content)) {
      const nestedUpdate = updateNodeSettingsById(
        currentNode.content,
        targetNodeId,
        settingsUpdater,
      );
      if (nestedUpdate.didChange) {
        didChange = true;
        return { ...currentNode, content: nestedUpdate.nextNodes };
      }
    }
    return currentNode;
  });
  return { nextNodes, didChange };
}

export function addSectionAfter(pageConfig, node, position = "after") {
  const content = Array.isArray(pageConfig?.content) ? pageConfig.content : [];
  const index = content.indexOf(node);
  const timestamp = Date.now();
  const nextSection = {
    id: `section-${timestamp}`,
    type: "section",
    content: [],
  };
  const nextContent = [...content];
  if (index === -1) {
    nextContent.push(nextSection);
  } else {
    const insertionIndex = position === "before" ? index : index + 1;
    nextContent.splice(insertionIndex, 0, nextSection);
  }
  return { ...pageConfig, content: nextContent };
}

export function moveSectionFn(pageConfig, node, direction) {
  const content = Array.isArray(pageConfig?.content)
    ? [...pageConfig.content]
    : [];
  const index = content.indexOf(node);
  if (index === -1) return pageConfig;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= content.length) return pageConfig;
  const [movedSection] = content.splice(index, 1);
  content.splice(targetIndex, 0, movedSection);
  return { ...pageConfig, content };
}

export function removeSection(pageConfig, node) {
  const content = Array.isArray(pageConfig?.content) ? pageConfig.content : [];
  return {
    ...pageConfig,
    content: content.filter((currentNode) => currentNode !== node),
  };
}

/**
 * Editor behavior controller for layout-style runtime components
 * (section / container / form / collection). The controller owns all
 * editor-only state on `this.host` (made reactive via createProperty on the
 * runtime class) and renders the full editor template via `render()`.
 *
 * Variant differences are expressed through the `config` object:
 *   - chrome flags (add/move/delete/shared-replace buttons)
 *   - default settings state extras
 *   - `renderGeneralSettingsExtras(controller)` for variant-specific fields
 *   - `getChildNodes(controller)` for variant-specific child source
 *     (collection multiplies its template across items)
 *   - `onConnected(controller)` / `onUpdated(controller, changed)` hooks
 */
export class LayoutEditorController {
  constructor(host, config = {}) {
    this.host = host;
    this.config = {
      variant: "container",
      shouldShowAddSectionButtons: false,
      shouldShowSectionReorderButtons: false,
      shouldShowDeleteButton: false,
      supportsReplaceWithSharedComponent: false,
      designColorVariables: DESIGN_COLOR_VARIABLES,
      getDefaultSettingsStateExtras: () => ({}),
      renderGeneralSettingsExtras: () => html``,
      getRenderedChildNodes: null,
      onVariantConnected: () => {},
      onVariantUpdated: () => {},
      onVariantDisconnected: () => {},
      ...config,
    };

    this.globalGridHandlePosition = null;
    this.activeGridPointerState = null;
    this.activeSectionResizeState = null;
    this.didLoadSharedComponentOptions = false;
    this.draftGridPlacements = {};
    this.globalHandleFrame = null;

    this.onGridPointerMove = this.onGridPointerMove.bind(this);
    this.onGridPointerUp = this.onGridPointerUp.bind(this);
    this.onSectionResizePointerMove =
      this.onSectionResizePointerMove.bind(this);
    this.onSectionResizePointerUp = this.onSectionResizePointerUp.bind(this);
    this.onActiveSettingsOwnerChanged =
      this.onActiveSettingsOwnerChanged.bind(this);

    this._initHostState();
  }

  _initHostState() {
    const host = this.host;
    initSettingsHostState(host);
    host.settings = new SettingsController(host, { focusRouter: true });

    const defaults = this.getDefaultSettingsState();
    for (const [key, value] of Object.entries(defaults)) {
      if (host[key] === undefined) host[key] = value;
    }

    host.showGridPreviewOverlay = false;
    host.hoveredGridChildId = "";
    host.isBlockPickerOpen = false;
    host.blockPickerType = "text";
    host.forceGridOverlayVisible = false;
    host.sharedComponentOptions = [];
    host.replaceWithSharedComponentId = "";
  }

  getDefaultSettingsState() {
    return {
      ...getDefaultLayoutSettingsState(),
      ...this.config.getDefaultSettingsStateExtras(),
    };
  }

  getInsertBlockOptions() {
    return BLOCK_INSERT_OPTIONS;
  }

  shouldShowAddSectionButtons() {
    return this.config.shouldShowAddSectionButtons;
  }

  shouldShowSectionReorderButtons() {
    return this.config.shouldShowSectionReorderButtons;
  }

  shouldShowDeleteButton() {
    return this.config.shouldShowDeleteButton;
  }

  supportsReplaceWithSharedComponent() {
    return this.config.supportsReplaceWithSharedComponent;
  }

  renderGeneralSettingsExtras() {
    return this.config.renderGeneralSettingsExtras(this);
  }

  onConnected() {
    this.host.settings.onConnected();
    window.addEventListener(
      "owb-active-settings-owner-changed",
      this.onActiveSettingsOwnerChanged,
    );
    this.config.onVariantConnected(this);
  }

  onWillUpdate(changedProperties) {
    this.host.settings.onWillUpdate(changedProperties);
  }

  onUpdated(changedProperties) {
    if (changedProperties.has("node")) {
      this.draftGridPlacements = {};
      this.cleanupGridPointerInteraction();
      this.host.settings.syncSettingsStateFromNode(
        this.getDefaultSettingsState(),
      );
    }
    if (
      changedProperties.has("hoveredGridChildId") ||
      changedProperties.has("activeGridPointerState")
    ) {
      this.scheduleGlobalHandleRefresh();
    }
    this.config.onVariantUpdated(this, changedProperties);
  }

  onDisconnected() {
    if (this.globalHandleFrame) {
      cancelAnimationFrame(this.globalHandleFrame);
      this.globalHandleFrame = null;
    }
    window.removeEventListener(
      "owb-active-settings-owner-changed",
      this.onActiveSettingsOwnerChanged,
    );
    this.cleanupGridPointerInteraction();
    this.cleanupSectionResizeInteraction();
    this.host.settings.onDisconnected();
    this.config.onVariantDisconnected(this);
  }

  openSettingsEditor(options) {
    this.host.settings.openSettingsEditor(options);
  }

  closeSettingsEditor() {
    this.host.settings.closeSettingsEditor();
    this.host.showGridPreviewOverlay = false;
    this.host.forceGridOverlayVisible = false;
    this.host.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
    this.host.isBlockPickerOpen = false;
    this.cleanupGridPointerInteraction();
    this.cleanupSectionResizeInteraction();
  }

  onActiveSettingsOwnerChanged() {
    this.host.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  getTrackedGridChildId() {
    if (this.activeGridPointerState?.childId) {
      return this.activeGridPointerState.childId;
    }
    const activeSettingsChildId = this.getActiveSettingsChildIdForSection();
    if (activeSettingsChildId) return activeSettingsChildId;
    const activeSettingsOwner = getActiveSettingsOwner();
    if (activeSettingsOwner && activeSettingsOwner !== this.host) return "";
    return this.host.hoveredGridChildId || "";
  }

  getActiveSettingsChildIdForSection() {
    const activeSettingsOwner = getActiveSettingsOwner();
    if (!activeSettingsOwner || activeSettingsOwner === this.host) return "";
    const activeOwnerNodeId = String(activeSettingsOwner?.node?.id || "");
    if (!activeOwnerNodeId) return "";
    const childNodes = this.getChildNodes();
    return childNodes.some(
      (child) => String(child?.id || "") === activeOwnerNodeId,
    )
      ? activeOwnerNodeId
      : "";
  }

  hasDescendantNodeId(targetNodeId, nodes = this.getChildNodes()) {
    const normalizedTargetId = String(targetNodeId || "");
    if (!normalizedTargetId || !Array.isArray(nodes)) return false;
    return nodes.some((node) => {
      if (!node || typeof node !== "object") return false;
      if (String(node.id || "") === normalizedTargetId) return true;
      if (Array.isArray(node.content)) {
        return this.hasDescendantNodeId(normalizedTargetId, node.content);
      }
      return false;
    });
  }

  isSettingsOwnedBySection() {
    const activeSettingsOwner = getActiveSettingsOwner();
    if (!activeSettingsOwner) return false;
    return (
      activeSettingsOwner === this.host ||
      Boolean(this.getActiveSettingsChildIdForSection())
    );
  }

  isTrackedChildSettingsOwner() {
    return Boolean(this.getActiveSettingsChildIdForSection());
  }

  onGridItemPointerEnter(childId) {
    if (!childId) return;
    this.host.hoveredGridChildId = childId;
    this.scheduleGlobalHandleRefresh();
  }

  onGridContainerPointerMove(event) {
    if (!this.isGridChildEditingEnabled() || this.activeGridPointerState) {
      return;
    }
    const activeSettingsOwner = getActiveSettingsOwner();
    if (activeSettingsOwner && activeSettingsOwner !== this.host) return;
    const target = event.target;
    const gridChildEl =
      target instanceof Element ? target.closest("[data-grid-child-id]") : null;
    const childId =
      gridChildEl && gridChildEl instanceof HTMLElement
        ? String(gridChildEl.dataset.gridChildId || "")
        : "";
    if (childId && childId !== this.host.hoveredGridChildId) {
      this.onGridItemPointerEnter(childId);
      return;
    }
    if (childId) return;
    const trackedId = this.host.hoveredGridChildId;
    if (!trackedId) return;
    if (this.isPointerInGridChildHoverZone(event, trackedId)) return;
    this.host.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  onSectionPointerLeave() {
    if (this.activeGridPointerState) return;
    if (
      this.host.isSettingsEditorOpen ||
      this.isSettingsOwnedBySection() ||
      this.isTrackedChildSettingsOwner()
    ) {
      return;
    }
    this.host.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  scheduleGlobalHandleRefresh() {
    if (this.globalHandleFrame) return;
    this.globalHandleFrame = requestAnimationFrame(() => {
      this.globalHandleFrame = null;
      this.refreshGlobalHandlePosition();
    });
  }

  getGridHandleAnchorRect(gridChildEl) {
    if (!(gridChildEl instanceof HTMLElement)) return null;
    const editorBlockEl = gridChildEl.shadowRoot?.querySelector(
      "[data-editor-block]",
    );
    if (editorBlockEl instanceof HTMLElement) {
      return editorBlockEl.getBoundingClientRect();
    }
    return gridChildEl.getBoundingClientRect();
  }

  getGridHandleAnchorRectByChildId(childId) {
    if (!childId) return null;
    const gridChildEl = this.host.renderRoot?.querySelector(
      `.section-grid-item[data-grid-child-id="${childId}"]`,
    );
    return this.getGridHandleAnchorRect(gridChildEl);
  }

  isPointerInGridChildHoverZone(event, childId) {
    const anchorRect = this.getGridHandleAnchorRectByChildId(childId);
    if (!anchorRect) return false;
    const minX = anchorRect.left - GRID_HANDLE_HOVER_PADDING;
    const maxX = anchorRect.right + GRID_HANDLE_HOVER_PADDING;
    const minY = anchorRect.top - GRID_HANDLE_HOVER_PADDING;
    const maxY = anchorRect.bottom + GRID_HANDLE_HOVER_PADDING;
    return (
      event.clientX >= minX &&
      event.clientX <= maxX &&
      event.clientY >= minY &&
      event.clientY <= maxY
    );
  }

  refreshGlobalHandlePosition() {
    const trackedId = this.getTrackedGridChildId();
    if (!trackedId) {
      if (this.globalGridHandlePosition) {
        this.globalGridHandlePosition = null;
        this.host.requestUpdate();
      }
      return;
    }
    const sectionEl = this.host.renderRoot?.querySelector("section");
    const gridChildEl = this.host.renderRoot?.querySelector(
      `.section-grid-item[data-grid-child-id="${trackedId}"]`,
    );
    if (!sectionEl || !gridChildEl) {
      if (this.globalGridHandlePosition) {
        this.globalGridHandlePosition = null;
        this.host.requestUpdate();
      }
      return;
    }
    const sectionRect = sectionEl.getBoundingClientRect();
    const anchorRect = this.getGridHandleAnchorRect(gridChildEl);
    if (!anchorRect) {
      if (this.globalGridHandlePosition) {
        this.globalGridHandlePosition = null;
        this.host.requestUpdate();
      }
      return;
    }
    this.globalGridHandlePosition = {
      left: anchorRect.left - sectionRect.left,
      top: anchorRect.top - sectionRect.top,
      right: anchorRect.right - sectionRect.left,
      bottom: anchorRect.bottom - sectionRect.top,
    };
    this.host.requestUpdate();
  }

  isGridChildEditingEnabled() {
    return (
      this.host.settingAlignmentMode === "visual" ||
      this.host.settingAlignmentMode === "grid"
    );
  }

  getChildNodes() {
    if (typeof this.config.getRenderedChildNodes === "function") {
      return this.config.getRenderedChildNodes(this);
    }
    return Array.isArray(this.host.node?.content) ? this.host.node.content : [];
  }

  getGridDimensions() {
    return {
      columns: Math.max(
        1,
        Number.parseInt(this.host.settingGridColumns, 10) || 1,
      ),
      rows: Math.max(1, Number.parseInt(this.host.settingGridRows, 10) || 1),
    };
  }

  normalizeGridPlacement(placement, fallbackIndex, columns, rows) {
    const fallbackColumnStart = (fallbackIndex % columns) + 1;
    const fallbackRowStart = Math.floor(fallbackIndex / columns) + 1;
    const columnSpanRaw = Number.parseInt(placement?.columnSpan, 10);
    const rowSpanRaw = Number.parseInt(placement?.rowSpan, 10);
    const columnSpan = Math.max(
      1,
      Number.isNaN(columnSpanRaw) ? 1 : columnSpanRaw,
    );
    const rowSpan = Math.max(1, Number.isNaN(rowSpanRaw) ? 1 : rowSpanRaw);
    const maxColumnStart = Math.max(1, columns - columnSpan + 1);
    const maxRowStart = Math.max(1, rows - rowSpan + 1);
    const columnStartRaw = Number.parseInt(placement?.columnStart, 10);
    const rowStartRaw = Number.parseInt(placement?.rowStart, 10);
    const columnStart = Math.min(
      Math.max(
        1,
        Number.isNaN(columnStartRaw) ? fallbackColumnStart : columnStartRaw,
      ),
      maxColumnStart,
    );
    const rowStart = Math.min(
      Math.max(1, Number.isNaN(rowStartRaw) ? fallbackRowStart : rowStartRaw),
      maxRowStart,
    );
    return {
      columnStart,
      rowStart,
      columnSpan: Math.min(columnSpan, columns - columnStart + 1),
      rowSpan: Math.min(rowSpan, rows - rowStart + 1),
    };
  }

  getSavedGridPlacement(node) {
    const settings =
      node && typeof node.settings === "object" && node.settings
        ? node.settings
        : {};
    return {
      columnStart: settings[GRID_SETTINGS_KEYS.columnStart],
      rowStart: settings[GRID_SETTINGS_KEYS.rowStart],
      columnSpan: settings[GRID_SETTINGS_KEYS.columnSpan],
      rowSpan: settings[GRID_SETTINGS_KEYS.rowSpan],
    };
  }

  getGridPlacementForChild(node, index, columns, rows) {
    const childId = typeof node?.id === "string" ? node.id : "";
    const draftPlacement = childId ? this.draftGridPlacements[childId] : null;
    const rawPlacement = draftPlacement || this.getSavedGridPlacement(node);
    return this.normalizeGridPlacement(rawPlacement, index, columns, rows);
  }

  getInteractiveSurfaceMetrics(columns) {
    const surfaceEl = this.host.renderRoot?.querySelector(
      ".container.is-grid-child-editing",
    );
    if (!surfaceEl) return null;
    const computedStyles = getComputedStyle(surfaceEl);
    const columnGap = Number.parseFloat(computedStyles.columnGap) || 0;
    const rowGap = Number.parseFloat(computedStyles.rowGap) || 0;
    const rowSize =
      Number.parseFloat(
        computedStyles.getPropertyValue("--section-grid-row-size"),
      ) || GRID_EDITOR_ROW_SIZE;
    const usableWidth = Math.max(
      surfaceEl.clientWidth - columnGap * (columns - 1),
      1,
    );
    const columnSize = usableWidth / columns;
    return {
      stepX: Math.max(1, columnSize + columnGap),
      stepY: Math.max(1, rowSize + rowGap),
    };
  }

  getSanitizedRowHeightValue() {
    const raw = String(this.host.settingRowHeight || "").trim();
    if (!raw) return `${GRID_EDITOR_ROW_SIZE}px`;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed <= 0) return `${GRID_EDITOR_ROW_SIZE}px`;
    return raw;
  }

  getSectionPaddingValues() {
    const preset =
      SECTION_PADDING_PRESETS[this.host.settingSizing] ||
      SECTION_PADDING_PRESETS.medium;
    const sanitize = (value, fallbackValue) => {
      const raw = String(value || "").trim();
      return raw || fallbackValue;
    };
    return {
      top: sanitize(this.host.settingPaddingTop, preset.top),
      right: sanitize(this.host.settingPaddingRight, preset.right),
      bottom: sanitize(this.host.settingPaddingBottom, preset.bottom),
      left: sanitize(this.host.settingPaddingLeft, preset.left),
    };
  }

  startGridPointerInteraction(
    event,
    childId,
    interactionType,
    resizeDirection = null,
  ) {
    if (!this.isGridChildEditingEnabled()) return;
    if (event.button !== 0 || !childId) return;
    const childNodes = this.getChildNodes();
    const childIndex = childNodes.findIndex((child) => child?.id === childId);
    if (childIndex === -1) return;
    const { columns, rows } = this.getGridDimensions();
    const initialPlacement = this.getGridPlacementForChild(
      childNodes[childIndex],
      childIndex,
      columns,
      rows,
    );
    this.activeGridPointerState = {
      childId,
      interactionType,
      resizeDirection,
      startX: event.clientX,
      startY: event.clientY,
      initialPlacement,
      columns,
      rows,
    };
    this.draftGridPlacements = {
      ...this.draftGridPlacements,
      [childId]: initialPlacement,
    };
    this.host.forceGridOverlayVisible = true;
    this.host.hoveredGridChildId = childId;
    this.host.requestUpdate();
    this.scheduleGlobalHandleRefresh();
    window.addEventListener("pointermove", this.onGridPointerMove);
    window.addEventListener("pointerup", this.onGridPointerUp);
    window.addEventListener("pointercancel", this.onGridPointerUp);
    event.preventDefault();
    event.stopPropagation();
  }

  onGridPointerMove(event) {
    if (!this.activeGridPointerState) return;
    const {
      childId,
      interactionType,
      resizeDirection,
      startX,
      startY,
      initialPlacement,
      columns,
      rows,
    } = this.activeGridPointerState;
    const metrics = this.getInteractiveSurfaceMetrics(columns);
    if (!metrics) return;
    const deltaColumns = Math.round((event.clientX - startX) / metrics.stepX);
    const deltaRows = Math.round((event.clientY - startY) / metrics.stepY);
    let nextPlacement = initialPlacement;
    if (interactionType === "move") {
      const maxColumnStart = Math.max(
        1,
        columns - initialPlacement.columnSpan + 1,
      );
      const maxRowStart = Math.max(1, rows - initialPlacement.rowSpan + 1);
      nextPlacement = {
        ...initialPlacement,
        columnStart: Math.min(
          Math.max(1, initialPlacement.columnStart + deltaColumns),
          maxColumnStart,
        ),
        rowStart: Math.min(
          Math.max(1, initialPlacement.rowStart + deltaRows),
          maxRowStart,
        ),
      };
    }
    if (interactionType === "resize") {
      if (resizeDirection === "right") {
        nextPlacement = {
          ...initialPlacement,
          columnSpan: Math.min(
            Math.max(1, initialPlacement.columnSpan + deltaColumns),
            columns - initialPlacement.columnStart + 1,
          ),
        };
      }
      if (resizeDirection === "bottom") {
        nextPlacement = {
          ...initialPlacement,
          rowSpan: Math.min(
            Math.max(1, initialPlacement.rowSpan + deltaRows),
            rows - initialPlacement.rowStart + 1,
          ),
        };
      }
      if (resizeDirection === "left") {
        const maxColumnStart =
          initialPlacement.columnStart + initialPlacement.columnSpan - 1;
        const nextColumnStart = Math.min(
          Math.max(1, initialPlacement.columnStart + deltaColumns),
          maxColumnStart,
        );
        const nextColumnSpan = Math.min(
          Math.max(1, maxColumnStart - nextColumnStart + 1),
          columns - nextColumnStart + 1,
        );
        nextPlacement = {
          ...initialPlacement,
          columnStart: nextColumnStart,
          columnSpan: nextColumnSpan,
        };
      }
      if (resizeDirection === "top") {
        const maxRowStart =
          initialPlacement.rowStart + initialPlacement.rowSpan - 1;
        const nextRowStart = Math.min(
          Math.max(1, initialPlacement.rowStart + deltaRows),
          maxRowStart,
        );
        const nextRowSpan = Math.min(
          Math.max(1, maxRowStart - nextRowStart + 1),
          rows - nextRowStart + 1,
        );
        nextPlacement = {
          ...initialPlacement,
          rowStart: nextRowStart,
          rowSpan: nextRowSpan,
        };
      }
    }
    this.draftGridPlacements = {
      ...this.draftGridPlacements,
      [childId]: nextPlacement,
    };
    this.host.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  onGridPointerUp() {
    if (!this.activeGridPointerState) return;
    const { childId } = this.activeGridPointerState;
    const nextPlacement = this.draftGridPlacements[childId];
    if (nextPlacement) this.persistChildGridPlacement(childId, nextPlacement);
    this.cleanupGridPointerInteraction();
    this.host.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  cleanupGridPointerInteraction() {
    this.activeGridPointerState = null;
    this.host.forceGridOverlayVisible = false;
    window.removeEventListener("pointermove", this.onGridPointerMove);
    window.removeEventListener("pointerup", this.onGridPointerUp);
    window.removeEventListener("pointercancel", this.onGridPointerUp);
    this.host.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  persistChildGridPlacement(childId, placement) {
    if (!childId || !Array.isArray(this.host.pageConfig?.content)) return;
    const { columns, rows } = this.getGridDimensions();
    const normalizedPlacement = this.normalizeGridPlacement(
      placement,
      0,
      columns,
      rows,
    );
    const applyGridSettings = (currentSettings) => {
      const baseSettings =
        currentSettings && typeof currentSettings === "object"
          ? currentSettings
          : {};
      const nextSettings = {
        ...baseSettings,
        [GRID_SETTINGS_KEYS.columnStart]: normalizedPlacement.columnStart,
        [GRID_SETTINGS_KEYS.rowStart]: normalizedPlacement.rowStart,
        [GRID_SETTINGS_KEYS.columnSpan]: normalizedPlacement.columnSpan,
        [GRID_SETTINGS_KEYS.rowSpan]: normalizedPlacement.rowSpan,
      };
      if (
        baseSettings[GRID_SETTINGS_KEYS.columnStart] ===
          nextSettings[GRID_SETTINGS_KEYS.columnStart] &&
        baseSettings[GRID_SETTINGS_KEYS.rowStart] ===
          nextSettings[GRID_SETTINGS_KEYS.rowStart] &&
        baseSettings[GRID_SETTINGS_KEYS.columnSpan] ===
          nextSettings[GRID_SETTINGS_KEYS.columnSpan] &&
        baseSettings[GRID_SETTINGS_KEYS.rowSpan] ===
          nextSettings[GRID_SETTINGS_KEYS.rowSpan]
      ) {
        return baseSettings;
      }
      return nextSettings;
    };
    const contentUpdate = updateNodeSettingsById(
      this.host.pageConfig.content,
      childId,
      applyGridSettings,
    );
    if (!contentUpdate.didChange) return;
    this.host.pageConfig = {
      ...this.host.pageConfig,
      content: contentUpdate.nextNodes,
    };
    if (Array.isArray(this.host.node?.content)) {
      const localUpdate = updateNodeSettingsById(
        this.host.node.content,
        childId,
        applyGridSettings,
      );
      if (localUpdate.didChange) {
        this.host.node = {
          ...this.host.node,
          content: localUpdate.nextNodes,
        };
      }
    }
    this.host.settings.dispatchPageConfigUpdated(this.host.pageConfig);
  }

  renderChildNode(node, renderOptions = {}) {
    if (typeof this.host.renderNodeFn !== "function") return html``;
    const childId = typeof node?.id === "string" ? node.id : "";
    return this.host.renderNodeFn(
      node,
      this.host.pageConfig,
      this.host.onPageConfigUpdated,
      this.host.renderNodeFn,
      {
        ...renderOptions,
        hostDataGridChildId: renderOptions.hostDataGridChildId ?? childId,
      },
    );
  }

  addSection(position) {
    const nextPageConfig = addSectionAfter(
      this.host.pageConfig,
      this.host.node,
      position,
    );
    this.host.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  moveSection(direction) {
    const nextPageConfig = moveSectionFn(
      this.host.pageConfig,
      this.host.node,
      direction,
    );
    this.host.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  deleteSection() {
    const nextPageConfig = removeSection(this.host.pageConfig, this.host.node);
    this.host.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  getDefaultChildNode(type) {
    if (type === "text") {
      return {
        id: createNodeId("text"),
        type: "text",
        content: "<p>New text block</p>",
      };
    }
    if (type === "image") {
      return { id: createNodeId("image"), type: "image", url: "" };
    }
    if (type === "input") {
      return {
        id: createNodeId("input"),
        type: "input",
        settings: {
          fieldType: "text",
          label: "Field label",
          name: "field",
          required: false,
          placeholder: "",
          min: "",
          max: "",
          step: "",
          rows: "4",
          minLength: "",
          maxLength: "",
          pattern: "",
        },
      };
    }
    if (type === "button") {
      return { id: createNodeId("button"), type: "button", content: "Button" };
    }
    if (type === "embed") {
      return { id: createNodeId("embed"), type: "embed", html: "" };
    }
    if (type === "social-media") {
      return {
        id: createNodeId("social-media"),
        type: "social-media",
        items: [
          {
            id: createNodeId("social-item"),
            name: "Social",
            link: "",
            icon: "globe",
            customIcon: "",
          },
        ],
      };
    }
    if (type === "shared") {
      return {
        id: createNodeId("shared"),
        type: "shared",
        settings: { shared_component_id: "" },
        content: [],
      };
    }
    if (type === "container") {
      return { id: createNodeId("container"), type: "container", content: [] };
    }
    if (type === "collection") {
      return {
        id: createNodeId("collection"),
        type: "collection",
        content: [
          {
            id: createNodeId("text"),
            type: "text",
            content: "<p>{{title}}</p>",
          },
        ],
        settings: {
          settingCollectionId: "",
          settingCollectionItemsCount: "all",
          settingCollectionSort: "disk",
        },
      };
    }
    if (type === "collection-content") {
      return {
        id: createNodeId("collection-content"),
        type: "collection-content",
      };
    }
    if (type === "form") {
      return {
        id: createNodeId("form"),
        type: "form",
        content: [],
        settings: {
          formActionUrl: "",
          formMethod: "post",
          formSubmitMode: "success-message",
          formSuccessMessage: "Thanks! Your form has been submitted.",
          formRedirectUrl: "",
        },
      };
    }
    if (type === "gallery") {
      return { id: createNodeId("gallery"), type: "gallery", images: [] };
    }
    if (type === "slider") {
      return { id: createNodeId("slider"), type: "slider", images: [] };
    }
    if (type === "navbar") {
      return { id: createNodeId("navbar"), type: "navbar", links: [] };
    }
    if (type === "captcha") {
      return {
        id: createNodeId("captcha"),
        type: "captcha",
        settings: { captchaChallengeUrl: "" },
      };
    }
    if (type === "checkbox") {
      return {
        id: createNodeId("checkbox"),
        type: "checkbox",
        settings: {
          checkboxLabel: "I agree to the terms",
          checkboxName: "agreement",
          checkboxValue: "",
          checkboxDefaultChecked: false,
          checkboxRequired: false,
        },
      };
    }
    return {
      id: createNodeId("text"),
      type: "text",
      content: "<p>New block</p>",
    };
  }

  updateSectionContent(nextContent) {
    const pageContent = Array.isArray(this.host.pageConfig?.content)
      ? this.host.pageConfig.content
      : [];
    const contentUpdate = updateNodeContentById(
      pageContent,
      this.host.node?.id,
      nextContent,
    );
    if (!contentUpdate.didChange) return;
    const nextPageConfig = {
      ...this.host.pageConfig,
      content: contentUpdate.nextNodes,
    };
    this.host.node = { ...this.host.node, content: nextContent };
    this.host.pageConfig = nextPageConfig;
    this.host.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  addChildBlock(type) {
    const childNodes = this.getChildNodes();
    const nextNode = this.getDefaultChildNode(type);
    this.updateSectionContent([...childNodes, nextNode]);
    this.host.isBlockPickerOpen = false;
  }

  moveChildBlock(direction) {
    const childId = this.getTrackedGridChildId();
    if (!childId) return;
    const childNodes = this.getChildNodes();
    const index = childNodes.findIndex((child) => child?.id === childId);
    if (index === -1) return;
    const targetIndex = direction === "backward" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= childNodes.length) return;
    const nextNodes = [...childNodes];
    const [movedNode] = nextNodes.splice(index, 1);
    nextNodes.splice(targetIndex, 0, movedNode);
    this.updateSectionContent(nextNodes);
    this.host.hoveredGridChildId = movedNode.id;
  }

  deleteTrackedChildBlock() {
    const childId = this.getTrackedGridChildId();
    if (!childId) return;
    const childNodes = this.getChildNodes();
    const nextNodes = childNodes.filter((child) => child?.id !== childId);
    if (nextNodes.length === childNodes.length) return;
    this.updateSectionContent(nextNodes);
    this.host.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  startSectionResize(event) {
    if (event.button !== 0) return;
    const containerEl = this.host.renderRoot?.querySelector(".container");
    if (!(containerEl instanceof HTMLElement)) return;
    const isVisualMode = this.host.settingAlignmentMode === "visual";
    const styles = getComputedStyle(containerEl);
    const rowSize =
      Number.parseFloat(styles.getPropertyValue("--section-grid-row-size")) ||
      GRID_EDITOR_ROW_SIZE;
    const rowGap = Number.parseFloat(styles.rowGap) || 0;
    const stepY = Math.max(1, rowSize + rowGap);
    const startRows = Math.max(
      1,
      Number.parseInt(this.host.settingGridRows, 10) || 1,
    );
    const startHeight =
      Number.parseFloat(String(this.host.settingFixedHeight || "").trim()) ||
      containerEl.getBoundingClientRect().height;
    this.activeSectionResizeState = {
      startY: event.clientY,
      isVisualMode,
      stepY,
      startRows,
      startHeight,
    };
    this.host.forceGridOverlayVisible = isVisualMode;
    window.addEventListener("pointermove", this.onSectionResizePointerMove);
    window.addEventListener("pointerup", this.onSectionResizePointerUp);
    window.addEventListener("pointercancel", this.onSectionResizePointerUp);
    event.preventDefault();
    event.stopPropagation();
  }

  onSectionResizePointerMove(event) {
    if (!this.activeSectionResizeState) return;
    const deltaY = event.clientY - this.activeSectionResizeState.startY;
    if (this.activeSectionResizeState.isVisualMode) {
      const deltaRows = Math.round(
        deltaY / this.activeSectionResizeState.stepY,
      );
      const nextRows = Math.max(
        1,
        this.activeSectionResizeState.startRows + deltaRows,
      );
      if (nextRows !== Number.parseInt(this.host.settingGridRows, 10)) {
        this.host.settings.updateSettingsState({ settingGridRows: nextRows });
      }
      return;
    }
    const nextHeight = Math.max(
      80,
      Math.round(this.activeSectionResizeState.startHeight + deltaY),
    );
    const nextValue = `${nextHeight}px`;
    if (nextValue !== this.host.settingFixedHeight) {
      this.host.settings.updateSettingsState({ settingFixedHeight: nextValue });
    }
  }

  onSectionResizePointerUp() {
    this.cleanupSectionResizeInteraction();
  }

  cleanupSectionResizeInteraction() {
    this.activeSectionResizeState = null;
    this.host.forceGridOverlayVisible = false;
    window.removeEventListener("pointermove", this.onSectionResizePointerMove);
    window.removeEventListener("pointerup", this.onSectionResizePointerUp);
    window.removeEventListener("pointercancel", this.onSectionResizePointerUp);
  }

  async loadSharedComponentOptions() {
    if (this.didLoadSharedComponentOptions) return;
    this.didLoadSharedComponentOptions = true;
    try {
      const components = await dataLayer.listSharedComponents();
      this.host.sharedComponentOptions = Array.isArray(components)
        ? components
            .map((component) => ({
              label: component?.title || component?.id || "Untitled",
              value: component?.id || "",
            }))
            .filter((component) => component.value)
        : [];
    } catch (error) {
      console.error(error);
      this.host.sharedComponentOptions = [];
    }
    if (
      !this.host.replaceWithSharedComponentId &&
      this.host.sharedComponentOptions[0]
    ) {
      this.host.replaceWithSharedComponentId =
        this.host.sharedComponentOptions[0].value;
    }
  }

  replaceCurrentSectionWithSharedComponent() {
    const sharedComponentId = String(
      this.host.replaceWithSharedComponentId || "",
    ).trim();
    if (
      !sharedComponentId ||
      !Array.isArray(this.host.pageConfig?.content) ||
      !this.host.node?.id
    ) {
      return;
    }
    let didReplace = false;
    const nextContent = this.host.pageConfig.content.map((currentNode) => {
      if (currentNode?.id !== this.host.node.id) return currentNode;
      didReplace = true;
      return {
        id: this.host.node.id,
        type: "shared",
        settings: { shared_component_id: sharedComponentId },
        content: [],
      };
    });
    if (!didReplace) return;
    const nextPageConfig = {
      ...this.host.pageConfig,
      content: nextContent,
    };
    this.host.settings.dispatchPageConfigUpdated(nextPageConfig);
    this.closeSettingsEditor();
  }

  onFocusNodeRequest(event) {
    const requestedNodeId = String(event?.detail?.nodeId || "");
    if (
      !requestedNodeId ||
      String(this.host.node?.id || "") !== requestedNodeId
    ) {
      return;
    }
    this.host.scrollIntoView({ block: "center", behavior: "smooth" });
    void this.openSectionSettings();
  }

  async openSectionSettings() {
    if (this.supportsReplaceWithSharedComponent()) {
      await this.loadSharedComponentOptions();
    }
    this.host.settings.syncSettingsStateFromNode(
      this.getDefaultSettingsState(),
    );
    this.openSettingsEditor({
      tabs: [
        { id: "general", label: "General" },
        { id: "design", label: "Design" },
      ],
      content: (tab) => this.renderSettingsTab(tab),
    });
  }

  renderSettingsTab(tab) {
    const host = this.host;
    if (tab === "general") {
      const options = [
        { label: "Normal", value: "normal" },
        { label: "Full width", value: "full" },
        { label: "Custom", value: "custom" },
      ];
      return html`<div>
        <settings-section
          title="Width"
          ?overridden=${host.settings.hasAnyOverriddenKeys(
            "settingWidth",
            "settingWidthCustomValue",
          )}
        >
          <editor-radio-button
            .options=${options}
            .value=${host.settingWidth}
            @change=${(e) => {
              host.settings.updateSettingsState({
                settingWidth: e.detail.value,
              });
            }}
          ></editor-radio-button>
          ${host.settingWidth === "custom"
            ? html`<editor-text-input
                label="Custom Width"
                placeholder="1024px"
                .value=${host.settingWidthCustomValue}
                @change=${(e) => {
                  host.settings.updateSettingsState({
                    settingWidthCustomValue: e.detail.value,
                  });
                }}
              ></editor-text-input>`
            : null}
        </settings-section>
        <settings-section
          title="Sizing"
          ?overridden=${host.settings.hasAnyOverriddenKeys(
            "settingSizing",
            "settingPaddingTop",
            "settingPaddingRight",
            "settingPaddingBottom",
            "settingPaddingLeft",
          )}
        >
          <editor-radio-button
            .options=${[
              { label: "None", value: "none" },
              { label: "Small", value: "small" },
              { label: "Medium", value: "medium" },
              { label: "Large", value: "large" },
              { label: "Custom", value: "custom" },
            ]}
            .value=${host.settingSizing}
            @change=${(e) => {
              host.settings.updateSettingsState({
                settingSizing: e.detail.value,
              });
            }}
          ></editor-radio-button>
          ${host.settingSizing === "custom"
            ? html`
                <editor-padding-input
                  .value=${{
                    top: host.settingPaddingTop,
                    right: host.settingPaddingRight,
                    bottom: host.settingPaddingBottom,
                    left: host.settingPaddingLeft,
                  }}
                  @change=${(e) => {
                    const paddingValues = e.detail.value || {};
                    host.settings.updateSettingsState({
                      settingPaddingTop: paddingValues.top || "",
                      settingPaddingRight: paddingValues.right || "",
                      settingPaddingBottom: paddingValues.bottom || "",
                      settingPaddingLeft: paddingValues.left || "",
                    });
                  }}
                ></editor-padding-input>
              `
            : null}
        </settings-section>
        <settings-section
          title="Alignment"
          ?overridden=${host.settings.hasAnyOverriddenKeys(
            "settingAlignmentMode",
            "settingGap",
            "settingRowHeight",
            "settingFlexDirection",
            "settingFlexHorizontal",
            "settingFlexVertical",
            "settingFlexJustifyContent",
            "settingFlexAlignItems",
            "settingFlexAlignContent",
            "settingGridRows",
            "settingGridColumns",
            "settingGridHorizontal",
            "settingGridVertical",
            "settingGridJustifyItems",
            "settingGridAlignItems",
            "settingGridJustifyContent",
            "settingGridAlignContent",
            "settingOtherAlignment",
            "settingFixedHeight",
          )}
        >
          <editor-alignment-options
            .value=${{
              mode: host.settingAlignmentMode,
              gap: host.settingGap,
              rowHeight: host.settingRowHeight,
              flexDirection: host.settingFlexDirection,
              flexHorizontal: host.settingFlexHorizontal,
              flexVertical: host.settingFlexVertical,
              flexJustifyContent: host.settingFlexJustifyContent,
              flexAlignItems: host.settingFlexAlignItems,
              flexAlignContent: host.settingFlexAlignContent,
              gridRows: host.settingGridRows,
              gridColumns: host.settingGridColumns,
              gridHorizontal: host.settingGridHorizontal,
              gridVertical: host.settingGridVertical,
              gridJustifyItems: host.settingGridJustifyItems,
              gridAlignItems: host.settingGridAlignItems,
              gridJustifyContent: host.settingGridJustifyContent,
              gridAlignContent: host.settingGridAlignContent,
              otherAlignment: host.settingOtherAlignment,
            }}
            @alignment-change=${(e) => {
              const next = e.detail.value;
              host.settings.updateSettingsState({
                settingAlignmentMode: next.mode,
                settingGap: next.gap,
                settingRowHeight: next.rowHeight,
                settingFlexDirection: next.flexDirection,
                settingFlexHorizontal: next.flexHorizontal,
                settingFlexVertical: next.flexVertical,
                settingFlexJustifyContent: next.flexJustifyContent,
                settingFlexAlignItems: next.flexAlignItems,
                settingFlexAlignContent: next.flexAlignContent,
                settingGridRows: next.gridRows,
                settingGridColumns: next.gridColumns,
                settingGridHorizontal: next.gridHorizontal,
                settingGridVertical: next.gridVertical,
                settingGridJustifyItems: next.gridJustifyItems,
                settingGridAlignItems: next.gridAlignItems,
                settingGridJustifyContent: next.gridJustifyContent,
                settingGridAlignContent: next.gridAlignContent,
                settingOtherAlignment: next.otherAlignment,
              });
            }}
            @grid-overlay-visibility-change=${(e) => {
              host.showGridPreviewOverlay = Boolean(e.detail?.visible);
            }}
          ></editor-alignment-options>
          ${host.settingAlignmentMode !== "visual"
            ? html`
                <editor-text-input
                  label="Fixed min height"
                  placeholder="320px"
                  .value=${host.settingFixedHeight}
                  @change=${(event) => {
                    host.settings.updateSettingsState({
                      settingFixedHeight: event.detail.value,
                    });
                  }}
                ></editor-text-input>
              `
            : null}
        </settings-section>
        ${this.renderGeneralSettingsExtras()}
        ${this.supportsReplaceWithSharedComponent()
          ? html`
              <settings-section title="Replace section">
                <editor-select
                  label="Shared component"
                  .options=${host.sharedComponentOptions.length > 0
                    ? host.sharedComponentOptions
                    : [{ label: "No shared components available", value: "" }]}
                  .value=${host.replaceWithSharedComponentId}
                  .disabled=${host.sharedComponentOptions.length === 0}
                  @change=${(event) => {
                    host.replaceWithSharedComponentId = event.detail.value;
                  }}
                ></editor-select>
                <editor-text-input
                  label="Or enter ID"
                  placeholder="navbar"
                  .value=${host.replaceWithSharedComponentId}
                  @change=${(event) => {
                    host.replaceWithSharedComponentId = event.detail.value;
                  }}
                ></editor-text-input>
                <editor-btn
                  style="light"
                  ?disabled=${!String(
                    host.replaceWithSharedComponentId || "",
                  ).trim()}
                  @click=${() =>
                    this.replaceCurrentSectionWithSharedComponent()}
                  >Replace with shared component</editor-btn
                >
              </settings-section>
            `
          : null}
      </div>`;
    }

    if (tab === "design") {
      return html`<div>
        <settings-section
          title="Background color"
          ?overridden=${host.settings.hasAnyOverriddenKeys(
            "settingBackgroundColor",
          )}
        >
          <editor-color-dots
            .options=${this.config.designColorVariables}
            .value=${host.settingBackgroundColor}
            label="Background color"
            @change=${(e) => {
              host.settings.updateSettingsState({
                settingBackgroundColor: e.detail.value,
              });
            }}
          ></editor-color-dots>
        </settings-section>
        <settings-section
          title="Text color"
          ?overridden=${host.settings.hasAnyOverriddenKeys("settingTextColor")}
        >
          <editor-color-dots
            .options=${this.config.designColorVariables}
            .value=${host.settingTextColor}
            label="Text color"
            @change=${(e) => {
              host.settings.updateSettingsState({
                settingTextColor: e.detail.value,
              });
            }}
          ></editor-color-dots>
        </settings-section>
      </div>`;
    }

    return html``;
  }

  onSectionPointerDown(event) {
    if (this.host.isSettingsEditorOpen) return;
    const activeSettingsOwner = getActiveSettingsOwner();
    const activeOwnerNodeId = String(activeSettingsOwner?.node?.id || "");
    const isActiveOwnerDescendant = this.hasDescendantNodeId(activeOwnerNodeId);
    if (
      activeSettingsOwner &&
      activeSettingsOwner !== this.host &&
      !isActiveOwnerDescendant
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const shouldIgnore =
      target.closest("[data-editor-block]") ||
      target.closest("[data-grid-child-id]") ||
      target.closest("editor-btn") ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select") ||
      target.closest(".global-grid-handles") ||
      target.closest(".section-block-picker") ||
      target.closest(".section-empty-state-actions") ||
      target.closest(".section-resize-handle");
    if (shouldIgnore) return;
    void this.openSectionSettings();
  }

  render() {
    const host = this.host;
    const childNodes = this.getChildNodes();
    const isGridChildEditingEnabled = this.isGridChildEditingEnabled();
    const { columns: previewColumns, rows: previewRows } =
      this.getGridDimensions();

    const widthStyle =
      host.settingWidth === "custom" && host.settingWidthCustomValue
        ? `max-width: ${host.settingWidthCustomValue};`
        : "";
    const backgroundColorStyle = host.settingBackgroundColor
      ? `background-color: var(${host.settingBackgroundColor});`
      : "";
    const textColorStyle = host.settingTextColor
      ? `color: var(${host.settingTextColor});`
      : "";
    const childBackgroundVarStyle = host.settingBackgroundColor
      ? `--owb-section-child-background-color: var(${host.settingBackgroundColor});`
      : "";
    const childTextVarStyle = host.settingTextColor
      ? `--owb-section-child-text-color: var(${host.settingTextColor});`
      : "";
    const layoutStyleParts = [];

    if (host.settingAlignmentMode === "flex" && !isGridChildEditingEnabled) {
      layoutStyleParts.push("display: flex;");
      layoutStyleParts.push(`flex-direction: ${host.settingFlexDirection};`);
      layoutStyleParts.push(
        `justify-content: ${host.settingFlexJustifyContent};`,
      );
      layoutStyleParts.push(`align-items: ${host.settingFlexAlignItems};`);
      if (host.settingGap) layoutStyleParts.push(`gap: ${host.settingGap};`);
    }

    if (host.settingAlignmentMode === "grid") {
      layoutStyleParts.push("display: grid;");
      layoutStyleParts.push(
        `grid-template-columns: repeat(${host.settingGridColumns || 1}, minmax(0, 1fr));`,
      );
      layoutStyleParts.push(
        `grid-template-rows: repeat(${host.settingGridRows || 1}, auto);`,
      );
      layoutStyleParts.push(
        `justify-content: ${host.settingGridJustifyContent};`,
      );
      layoutStyleParts.push(`align-items: ${host.settingGridAlignItems};`);
      layoutStyleParts.push(`align-content: ${host.settingGridAlignContent};`);
      if (host.settingGap) layoutStyleParts.push(`gap: ${host.settingGap};`);
    }

    if (host.settingAlignmentMode === "other") {
      layoutStyleParts.push(`display: ${host.settingOtherAlignment};`);
    }

    const layoutStyle = layoutStyleParts.join("");
    const previewCellCount = Math.min(previewColumns * previewRows, 2500);
    const shouldRenderGridOverlay =
      ((host.isSettingsEditorOpen && host.showGridPreviewOverlay) ||
        host.forceGridOverlayVisible) &&
      (host.settingAlignmentMode === "grid" ||
        host.settingAlignmentMode === "visual");
    const rowHeight = this.getSanitizedRowHeightValue();
    const sectionPadding = this.getSectionPaddingValues();
    const trackedGridChildId = this.getTrackedGridChildId();
    const trackedGridChildNode = childNodes.find(
      (child) => child?.id === trackedGridChildId,
    );
    const trackedImageSizeMode =
      trackedGridChildNode?.type === "image"
        ? String(trackedGridChildNode?.settings?.imageSizeMode || "contained")
        : "contained";
    const showVerticalResizeHandles = trackedImageSizeMode !== "full-width";
    const showHorizontalResizeHandles = true;
    const isFocusedHandleStateLocked = this.isSettingsOwnedBySection();
    const shouldRenderGlobalGridHandles =
      isGridChildEditingEnabled &&
      Boolean(trackedGridChildId) &&
      Boolean(this.globalGridHandlePosition);
    const gridEditingStyle = isGridChildEditingEnabled
      ? `--section-grid-columns: ${previewColumns}; --section-grid-rows: ${previewRows}; --section-grid-gap: ${host.settingGap || "0px"}; --section-grid-row-size: ${rowHeight};`
      : "";
    const fixedHeightStyle =
      host.settingAlignmentMode === "visual" || !host.settingFixedHeight
        ? ""
        : `min-height: ${host.settingFixedHeight};`;
    const sectionPaddingStyle = `--section-padding-top: ${sectionPadding.top}; --section-padding-right: ${sectionPadding.right}; --section-padding-bottom: ${sectionPadding.bottom}; --section-padding-left: ${sectionPadding.left};`;
    const sectionClassName =
      `${host.isSettingsEditorOpen ? "is-settings-open" : ""} ${isFocusedHandleStateLocked ? "is-focus-locked" : ""}`.trim();

    return html`<div>
      <section
        class="${sectionClassName}"
        style="${backgroundColorStyle}${textColorStyle}${childBackgroundVarStyle}${childTextVarStyle}"
        @pointerdown=${(event) => this.onSectionPointerDown(event)}
        @pointermove=${(event) => this.onGridContainerPointerMove(event)}
        @pointerleave=${() => this.onSectionPointerLeave()}
      >
        ${this.shouldShowAddSectionButtons()
          ? html`
              <editor-btn
                style="primary"
                class="add-section-button"
                @click=${() => this.addSection("before")}
              >
                Add section
              </editor-btn>
            `
          : null}
        ${host.node?.type === "shared"
          ? html`<span class="shared-badge">Shared Component</span>`
          : ""}
        <div
          class="container is-${host.settingWidth}-width ${isGridChildEditingEnabled
            ? `is-grid-child-editing is-${host.settingAlignmentMode}-mode`
            : ""}"
          style="${widthStyle}${layoutStyle}${sectionPaddingStyle}${gridEditingStyle}${fixedHeightStyle}"
        >
          ${childNodes.length === 0
            ? html`
                <div class="section-empty-state">
                  <p>This section is empty.</p>
                  <div class="section-empty-state-actions">
                    <editor-btn
                      style="primary"
                      @click=${() => {
                        host.blockPickerType = "text";
                        host.isBlockPickerOpen = true;
                      }}
                      >Add first block</editor-btn
                    >
                    <editor-btn
                      style="light"
                      @click=${() => this.addChildBlock("shared")}
                      >Use shared component</editor-btn
                    >
                  </div>
                </div>
              `
            : isGridChildEditingEnabled
              ? html`
                  ${childNodes.map((child, index) => {
                    const childId =
                      typeof child?.id === "string" ? child.id : "";
                    const placement = this.getGridPlacementForChild(
                      child,
                      index,
                      previewColumns,
                      previewRows,
                    );
                    const isInteracting =
                      this.activeGridPointerState?.childId === childId;
                    return host.renderNodeFn(
                      child,
                      host.pageConfig,
                      host.onPageConfigUpdated,
                      host.renderNodeFn,
                      {
                        hostClass: `section-grid-item ${isInteracting ? "is-interacting" : ""}`,
                        hostStyle: `grid-column: ${placement.columnStart} / span ${placement.columnSpan}; grid-row: ${placement.rowStart} / span ${placement.rowSpan};`,
                        hostDataGridChildId: childId,
                      },
                    );
                  })}
                `
              : html`${childNodes.map((child) => this.renderChildNode(child))}`}
          ${shouldRenderGridOverlay
            ? html`
                <div
                  class="grid-preview-overlay"
                  style=${`--grid-preview-columns: ${previewColumns}; --grid-preview-rows: ${previewRows}; --grid-preview-gap: ${host.settingGap || "0px"};`}
                >
                  ${Array.from(
                    { length: previewCellCount },
                    () => html`<span class="grid-preview-cell"></span>`,
                  )}
                </div>
              `
            : null}
        </div>
        ${shouldRenderGlobalGridHandles
          ? html`
              <div
                class="global-grid-handles"
                style=${`--grid-handle-left: ${this.globalGridHandlePosition.left}px; --grid-handle-top: ${this.globalGridHandlePosition.top}px; --grid-handle-right: ${this.globalGridHandlePosition.right}px; --grid-handle-bottom: ${this.globalGridHandlePosition.bottom}px;`}
              >
                <div
                  class="grid-item-highlight-outline"
                  aria-hidden="true"
                ></div>
                <button
                  class="grid-item-move-handle"
                  type="button"
                  title="Move on grid"
                  ?disabled=${!trackedGridChildId}
                  @pointerdown=${(event) =>
                    this.startGridPointerInteraction(
                      event,
                      trackedGridChildId,
                      "move",
                    )}
                >
                  ${createElement(Move)}
                </button>
                ${showVerticalResizeHandles
                  ? html`
                      <button
                        class="grid-item-resize-bar is-top"
                        type="button"
                        title="Resize from top"
                        ?disabled=${!trackedGridChildId}
                        @pointerdown=${(event) =>
                          this.startGridPointerInteraction(
                            event,
                            trackedGridChildId,
                            "resize",
                            "top",
                          )}
                      ></button>
                    `
                  : null}
                ${showHorizontalResizeHandles
                  ? html`
                      <button
                        class="grid-item-resize-bar is-right"
                        type="button"
                        title="Resize from right"
                        ?disabled=${!trackedGridChildId}
                        @pointerdown=${(event) =>
                          this.startGridPointerInteraction(
                            event,
                            trackedGridChildId,
                            "resize",
                            "right",
                          )}
                      ></button>
                    `
                  : null}
                ${showVerticalResizeHandles
                  ? html`
                      <button
                        class="grid-item-resize-bar is-bottom"
                        type="button"
                        title="Resize from bottom"
                        ?disabled=${!trackedGridChildId}
                        @pointerdown=${(event) =>
                          this.startGridPointerInteraction(
                            event,
                            trackedGridChildId,
                            "resize",
                            "bottom",
                          )}
                      ></button>
                    `
                  : null}
                ${showHorizontalResizeHandles
                  ? html`
                      <button
                        class="grid-item-resize-bar is-left"
                        type="button"
                        title="Resize from left"
                        ?disabled=${!trackedGridChildId}
                        @pointerdown=${(event) =>
                          this.startGridPointerInteraction(
                            event,
                            trackedGridChildId,
                            "resize",
                            "left",
                          )}
                      ></button>
                    `
                  : null}
              </div>
            `
          : null}
        <div class="section-controls">
          <editor-btn
            style="light"
            title="Add element"
            @click=${() => {
              host.isBlockPickerOpen = !host.isBlockPickerOpen;
            }}
            >${createElement(Plus)} Add element</editor-btn
          >
          ${this.shouldShowSectionReorderButtons()
            ? html`
                <editor-btn
                  style="light"
                  title="Move section up"
                  @click=${() => this.moveSection("up")}
                  >${createElement(ArrowUp)}</editor-btn
                >
                <editor-btn
                  style="light"
                  title="Move section down"
                  @click=${() => this.moveSection("down")}
                  >${createElement(ArrowDown)}</editor-btn
                >
              `
            : null}
          ${this.shouldShowDeleteButton()
            ? html`
                <editor-btn
                  style="light text-danger"
                  title="Delete section"
                  @click=${() => this.deleteSection()}
                  >${createElement(Trash)}</editor-btn
                >
              `
            : null}
        </div>
        ${host.isBlockPickerOpen
          ? html`
              <div class="section-block-picker">
                <editor-select
                  label="Block type"
                  .options=${this.getInsertBlockOptions()}
                  .value=${host.blockPickerType}
                  @change=${(event) => {
                    host.blockPickerType = event.detail.value;
                  }}
                ></editor-select>
                <div class="section-block-picker-actions">
                  <editor-btn
                    style="primary"
                    @click=${() => this.addChildBlock(host.blockPickerType)}
                    >Insert block</editor-btn
                  >
                  <editor-btn
                    style="light"
                    @click=${() => {
                      host.isBlockPickerOpen = false;
                    }}
                    >Cancel</editor-btn
                  >
                </div>
              </div>
            `
          : null}
        <button
          class="section-resize-handle"
          type="button"
          title="Resize section"
          @pointerdown=${(event) => this.startSectionResize(event)}
        ></button>
        ${this.shouldShowAddSectionButtons()
          ? html`
              <editor-btn
                style="primary"
                class="add-section-button bottom"
                @click=${() => this.addSection("after")}
              >
                Add section
              </editor-btn>
            `
          : null}
      </section>
    </div>`;
  }
}

/**
 * List of reactive properties that the editor adds to the runtime component
 * class via `createProperty`. Call this from each variant's editor module:
 *   registerLayoutEditorProperties(OwbSection)
 */
export function registerLayoutEditorProperties(RuntimeClass, extras = {}) {
  const props = {
    node: { type: Object },
    pageConfig: { type: Object },
    renderNodeFn: { attribute: false },
    onPageConfigUpdated: { attribute: false },

    ...SETTINGS_HOST_PROPERTIES,

    // Setting* props (all writable from settings UI; reflected for diffing)
    settingWidth: { type: String },
    settingWidthCustomValue: { type: String },
    settingBackgroundColor: { type: String },
    settingTextColor: { type: String },
    settingAlignmentMode: { type: String },
    settingGap: { type: String },
    settingRowHeight: { type: String },
    settingFixedHeight: { type: String },
    settingSizing: { type: String },
    settingPaddingTop: { type: String },
    settingPaddingBottom: { type: String },
    settingPaddingLeft: { type: String },
    settingPaddingRight: { type: String },
    settingFlexDirection: { type: String },
    settingFlexHorizontal: { type: String },
    settingFlexVertical: { type: String },
    settingFlexJustifyContent: { type: String },
    settingFlexAlignItems: { type: String },
    settingFlexAlignContent: { type: String },
    settingGridRows: { type: Number },
    settingGridColumns: { type: Number },
    settingGridHorizontal: { type: String },
    settingGridVertical: { type: String },
    settingGridJustifyItems: { type: String },
    settingGridAlignItems: { type: String },
    settingGridJustifyContent: { type: String },
    settingGridAlignContent: { type: String },
    settingOtherAlignment: { type: String },

    // Editor-only transient state
    showGridPreviewOverlay: { type: Boolean },
    hoveredGridChildId: { type: String },
    isBlockPickerOpen: { type: Boolean },
    blockPickerType: { type: String },
    forceGridOverlayVisible: { type: Boolean },
    sharedComponentOptions: { type: Array },
    replaceWithSharedComponentId: { type: String },

    ...extras,
  };
  for (const [name, options] of Object.entries(props)) {
    RuntimeClass.createProperty(name, options);
  }
}
