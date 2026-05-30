import { LitElement, html, css, unsafeCSS } from "lit";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";
import {
  SettingsController,
  SETTINGS_HOST_PROPERTIES,
  initSettingsHostState,
  getActiveSettingsOwner,
} from "../../../editor/components/layout/editor-component/settings-controller.js";
import { dataLayer } from "../../../editor/data/data-layer.js";
import { withVariantConfig } from "../variant-component-base.js";
import { ArrowDown, ArrowUp, Trash, Move, Plus, createElement } from "lucide";
import styles from "./styles.css?inline";
import { OwbSection } from "./section.js";

export const defaultSectionConfig = {
  type: "section",
  content: [],
};

const GRID_SETTINGS_KEYS = {
  columnStart: "gridColumnStart",
  rowStart: "gridRowStart",
  columnSpan: "gridColumnSpan",
  rowSpan: "gridRowSpan",
};

const GRID_EDITOR_ROW_SIZE = 30;
const GRID_HANDLE_HOVER_PADDING = 16;

const SECTION_PADDING_PRESETS = {
  none: {
    top: "0",
    right: "0",
    bottom: "0",
    left: "0",
  },
  small: {
    top: "2rem",
    right: "2rem",
    bottom: "2rem",
    left: "2rem",
  },
  medium: {
    top: "5rem",
    right: "2rem",
    bottom: "5rem",
    left: "2rem",
  },
  large: {
    top: "8rem",
    right: "2rem",
    bottom: "8rem",
    left: "2rem",
  },
};

const BLOCK_INSERT_OPTIONS = [
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

function getDefaultLayoutSettingsState() {
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

function getPublishedSectionStyle(settings = {}) {
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

function getPublishedContainerStyle(settings = {}) {
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
      // The editor visual-mode grid always stretches items to their tracks.
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

function createNodeId(type) {
  return `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function updateNodeContentById(nodes, targetNodeId, nextContent) {
  let didChange = false;

  const nextNodes = nodes.map((currentNode) => {
    if (!currentNode || typeof currentNode !== "object") {
      return currentNode;
    }

    if (currentNode.id === targetNodeId) {
      didChange = true;
      return {
        ...currentNode,
        content: nextContent,
      };
    }

    if (Array.isArray(currentNode.content)) {
      const nested = updateNodeContentById(
        currentNode.content,
        targetNodeId,
        nextContent,
      );

      if (nested.didChange) {
        didChange = true;
        return {
          ...currentNode,
          content: nested.nextNodes,
        };
      }
    }

    return currentNode;
  });

  return {
    nextNodes,
    didChange,
  };
}

export class OwbLayoutContainerEditor extends withVariantConfig(LitElement) {
  static designColorVariables = [
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

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    renderNodeFn: { attribute: false },
    onPageConfigUpdated: { attribute: false },

    ...SETTINGS_HOST_PROPERTIES,

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
    showGridPreviewOverlay: { type: Boolean },
    hoveredGridChildId: { type: String },
    globalGridHandlePosition: { attribute: false },
    isBlockPickerOpen: { type: Boolean },
    blockPickerType: { type: String },
    forceGridOverlayVisible: { type: Boolean },
    sharedComponentOptions: { type: Array },
    replaceWithSharedComponentId: { type: String },
  };

  static styles = [unsafeCSS(blocksStyles), unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.renderNodeFn = null;
    this.onPageConfigUpdated = null;
    initSettingsHostState(this);
    this.settings = new SettingsController(this, { focusRouter: true });
    this.settingWidth = "normal";
    this.settingWidthCustomValue = "";
    this.settingBackgroundColor = "";
    this.settingTextColor = "";
    this.settingAlignmentMode = "block";
    this.settingGap = "";
    this.settingRowHeight = `${GRID_EDITOR_ROW_SIZE}px`;
    this.settingFixedHeight = "";
    this.settingSizing = "medium";
    this.settingPaddingTop = "";
    this.settingPaddingBottom = "";
    this.settingPaddingLeft = "";
    this.settingPaddingRight = "";
    this.settingFlexDirection = "row";
    this.settingFlexHorizontal = "start";
    this.settingFlexVertical = "start";
    this.settingFlexJustifyContent = "flex-start";
    this.settingFlexAlignItems = "flex-start";
    this.settingFlexAlignContent = "stretch";
    this.settingGridRows = 2;
    this.settingGridColumns = 2;
    this.settingGridHorizontal = "start";
    this.settingGridVertical = "start";
    this.settingGridJustifyItems = "start";
    this.settingGridAlignItems = "start";
    this.settingGridJustifyContent = "start";
    this.settingGridAlignContent = "start";
    this.settingOtherAlignment = "block";
    this.showGridPreviewOverlay = false;
    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
    this.isBlockPickerOpen = false;
    this.blockPickerType = "text";
    this.forceGridOverlayVisible = false;
    this.sharedComponentOptions = [];
    this.replaceWithSharedComponentId = "";
    this.didLoadSharedComponentOptions = false;
    this.activeGridPointerState = null;
    this.activeSectionResizeState = null;
    this.draftGridPlacements = {};
    this.globalHandleFrame = null;
    this.onGridPointerMove = this.onGridPointerMove.bind(this);
    this.onGridPointerUp = this.onGridPointerUp.bind(this);
    this.onSectionResizePointerMove =
      this.onSectionResizePointerMove.bind(this);
    this.onSectionResizePointerUp = this.onSectionResizePointerUp.bind(this);
    this.onActiveSettingsOwnerChanged =
      this.onActiveSettingsOwnerChanged.bind(this);
  }

  getDefaultSettingsState() {
    return getDefaultLayoutSettingsState();
  }

  getInsertBlockOptions() {
    return BLOCK_INSERT_OPTIONS;
  }

  shouldShowAddSectionButtons() {
    return false;
  }

  shouldShowSectionReorderButtons() {
    return false;
  }

  shouldShowDeleteButton() {
    return false;
  }

  supportsReplaceWithSharedComponent() {
    return false;
  }

  renderGeneralSettingsExtras() {
    return html``;
  }

  connectedCallback() {
    super.connectedCallback();
    this.settings.onConnected();
    window.addEventListener(
      "owb-active-settings-owner-changed",
      this.onActiveSettingsOwnerChanged,
    );
  }

  willUpdate(changedProperties) {
    this.settings.onWillUpdate(changedProperties);
  }

  openSettingsEditor(options) {
    this.settings.openSettingsEditor(options);
  }

  closeSettingsEditor() {
    this.settings.closeSettingsEditor();
    this.showGridPreviewOverlay = false;
    this.forceGridOverlayVisible = false;
    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
    this.isBlockPickerOpen = false;
    this.cleanupGridPointerInteraction();
    this.cleanupSectionResizeInteraction();
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.draftGridPlacements = {};
      this.cleanupGridPointerInteraction();

      this.settings.syncSettingsStateFromNode(this.getDefaultSettingsState());
    }

    if (
      changedProperties.has("hoveredGridChildId") ||
      changedProperties.has("activeGridPointerState")
    ) {
      this.scheduleGlobalHandleRefresh();
    }
  }

  disconnectedCallback() {
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
    this.settings.onDisconnected();
    super.disconnectedCallback();
  }

  onActiveSettingsOwnerChanged() {
    this.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  getTrackedGridChildId() {
    if (this.activeGridPointerState?.childId) {
      return this.activeGridPointerState.childId;
    }

    const activeSettingsChildId = this.getActiveSettingsChildIdForSection();
    if (activeSettingsChildId) {
      return activeSettingsChildId;
    }

    const activeSettingsOwner = getActiveSettingsOwner();
    if (activeSettingsOwner && activeSettingsOwner !== this) {
      return "";
    }

    return this.hoveredGridChildId || "";
  }

  getActiveSettingsChildIdForSection() {
    const activeSettingsOwner = getActiveSettingsOwner();
    if (!activeSettingsOwner || activeSettingsOwner === this) {
      return "";
    }

    const activeOwnerNodeId = String(activeSettingsOwner?.node?.id || "");
    if (!activeOwnerNodeId) {
      return "";
    }

    const childNodes = this.getChildNodes();
    return childNodes.some(
      (child) => String(child?.id || "") === activeOwnerNodeId,
    )
      ? activeOwnerNodeId
      : "";
  }

  hasDescendantNodeId(targetNodeId, nodes = this.getChildNodes()) {
    const normalizedTargetId = String(targetNodeId || "");
    if (!normalizedTargetId || !Array.isArray(nodes)) {
      return false;
    }

    return nodes.some((node) => {
      if (!node || typeof node !== "object") {
        return false;
      }

      if (String(node.id || "") === normalizedTargetId) {
        return true;
      }

      if (Array.isArray(node.content)) {
        return this.hasDescendantNodeId(normalizedTargetId, node.content);
      }

      return false;
    });
  }

  isSettingsOwnedBySection() {
    const activeSettingsOwner = getActiveSettingsOwner();
    if (!activeSettingsOwner) {
      return false;
    }

    return (
      activeSettingsOwner === this ||
      Boolean(this.getActiveSettingsChildIdForSection())
    );
  }

  isTrackedChildSettingsOwner() {
    return Boolean(this.getActiveSettingsChildIdForSection());
  }

  onGridItemPointerEnter(childId) {
    if (!childId) {
      return;
    }

    this.hoveredGridChildId = childId;
    this.scheduleGlobalHandleRefresh();
  }

  onGridContainerPointerMove(event) {
    if (!this.isGridChildEditingEnabled() || this.activeGridPointerState) {
      return;
    }

    // Disable hover detection if a settings panel is open on a different component
    const activeSettingsOwner = getActiveSettingsOwner();
    if (activeSettingsOwner && activeSettingsOwner !== this) {
      return;
    }

    const target = event.target;
    const gridChildEl =
      target instanceof Element ? target.closest("[data-grid-child-id]") : null;
    const childId =
      gridChildEl && gridChildEl instanceof HTMLElement
        ? String(gridChildEl.dataset.gridChildId || "")
        : "";

    if (childId && childId !== this.hoveredGridChildId) {
      this.onGridItemPointerEnter(childId);
      return;
    }

    if (childId) {
      return;
    }

    const trackedId = this.hoveredGridChildId;
    if (!trackedId) {
      return;
    }

    if (this.isPointerInGridChildHoverZone(event, trackedId)) {
      return;
    }

    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  onSectionPointerLeave() {
    if (this.activeGridPointerState) {
      return;
    }

    // Keep the current focused child while this section owns the settings panel.
    if (
      this.isSettingsEditorOpen ||
      this.isSettingsOwnedBySection() ||
      this.isTrackedChildSettingsOwner()
    ) {
      return;
    }

    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  scheduleGlobalHandleRefresh() {
    if (this.globalHandleFrame) {
      return;
    }

    this.globalHandleFrame = requestAnimationFrame(() => {
      this.globalHandleFrame = null;
      this.refreshGlobalHandlePosition();
    });
  }

  getGridHandleAnchorRect(gridChildEl) {
    if (!(gridChildEl instanceof HTMLElement)) {
      return null;
    }

    const editorBlockEl = gridChildEl.shadowRoot?.querySelector(
      "[data-editor-block]",
    );
    if (editorBlockEl instanceof HTMLElement) {
      return editorBlockEl.getBoundingClientRect();
    }

    return gridChildEl.getBoundingClientRect();
  }

  getGridHandleAnchorRectByChildId(childId) {
    if (!childId) {
      return null;
    }

    const gridChildEl = this.renderRoot?.querySelector(
      `.section-grid-item[data-grid-child-id="${childId}"]`,
    );

    return this.getGridHandleAnchorRect(gridChildEl);
  }

  isPointerInGridChildHoverZone(event, childId) {
    const anchorRect = this.getGridHandleAnchorRectByChildId(childId);
    if (!anchorRect) {
      return false;
    }

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
      }
      return;
    }

    const sectionEl = this.renderRoot?.querySelector("section");
    const gridChildEl = this.renderRoot?.querySelector(
      `.section-grid-item[data-grid-child-id="${trackedId}"]`,
    );

    if (!sectionEl || !gridChildEl) {
      if (this.globalGridHandlePosition) {
        this.globalGridHandlePosition = null;
      }
      return;
    }

    const sectionRect = sectionEl.getBoundingClientRect();
    const anchorRect = this.getGridHandleAnchorRect(gridChildEl);
    if (!anchorRect) {
      if (this.globalGridHandlePosition) {
        this.globalGridHandlePosition = null;
      }
      return;
    }

    this.globalGridHandlePosition = {
      left: anchorRect.left - sectionRect.left,
      top: anchorRect.top - sectionRect.top,
      right: anchorRect.right - sectionRect.left,
      bottom: anchorRect.bottom - sectionRect.top,
    };
  }

  isGridChildEditingEnabled() {
    return (
      this.settingAlignmentMode === "visual" ||
      this.settingAlignmentMode === "grid"
    );
  }

  getChildNodes() {
    return Array.isArray(this.node?.content) ? this.node.content : [];
  }

  getGridDimensions() {
    return {
      columns: Math.max(1, Number.parseInt(this.settingGridColumns, 10) || 1),
      rows: Math.max(1, Number.parseInt(this.settingGridRows, 10) || 1),
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
    const surfaceEl = this.renderRoot?.querySelector(
      ".container.is-grid-child-editing",
    );
    if (!surfaceEl) {
      return null;
    }

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
    const raw = String(this.settingRowHeight || "").trim();
    if (!raw) {
      return `${GRID_EDITOR_ROW_SIZE}px`;
    }

    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return `${GRID_EDITOR_ROW_SIZE}px`;
    }

    return raw;
  }

  getSectionPaddingValues() {
    const preset =
      SECTION_PADDING_PRESETS[this.settingSizing] ||
      SECTION_PADDING_PRESETS.medium;
    const sanitize = (value, fallbackValue) => {
      const raw = String(value || "").trim();
      return raw || fallbackValue;
    };
    return {
      top: sanitize(this.settingPaddingTop, preset.top),
      right: sanitize(this.settingPaddingRight, preset.right),
      bottom: sanitize(this.settingPaddingBottom, preset.bottom),
      left: sanitize(this.settingPaddingLeft, preset.left),
    };
  }

  startGridPointerInteraction(
    event,
    childId,
    interactionType,
    resizeDirection = null,
  ) {
    if (!this.isGridChildEditingEnabled()) {
      return;
    }

    if (event.button !== 0 || !childId) {
      return;
    }

    const childNodes = this.getChildNodes();
    const childIndex = childNodes.findIndex((child) => child?.id === childId);
    if (childIndex === -1) {
      return;
    }

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
    this.forceGridOverlayVisible = true;
    this.hoveredGridChildId = childId;
    this.requestUpdate();
    this.scheduleGlobalHandleRefresh();

    window.addEventListener("pointermove", this.onGridPointerMove);
    window.addEventListener("pointerup", this.onGridPointerUp);
    window.addEventListener("pointercancel", this.onGridPointerUp);

    event.preventDefault();
    event.stopPropagation();
  }

  onGridPointerMove(event) {
    if (!this.activeGridPointerState) {
      return;
    }

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
    if (!metrics) {
      return;
    }

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
    this.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  onGridPointerUp() {
    if (!this.activeGridPointerState) {
      return;
    }

    const { childId } = this.activeGridPointerState;
    const nextPlacement = this.draftGridPlacements[childId];
    if (nextPlacement) {
      this.persistChildGridPlacement(childId, nextPlacement);
    }

    this.cleanupGridPointerInteraction();
    this.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  cleanupGridPointerInteraction() {
    this.activeGridPointerState = null;
    this.forceGridOverlayVisible = false;
    window.removeEventListener("pointermove", this.onGridPointerMove);
    window.removeEventListener("pointerup", this.onGridPointerUp);
    window.removeEventListener("pointercancel", this.onGridPointerUp);
    this.requestUpdate();
    this.scheduleGlobalHandleRefresh();
  }

  persistChildGridPlacement(childId, placement) {
    if (!childId || !Array.isArray(this.pageConfig?.content)) {
      return;
    }

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
      this.pageConfig.content,
      childId,
      applyGridSettings,
    );

    if (!contentUpdate.didChange) {
      return;
    }

    this.pageConfig = {
      ...this.pageConfig,
      content: contentUpdate.nextNodes,
    };

    if (Array.isArray(this.node?.content)) {
      const localUpdate = updateNodeSettingsById(
        this.node.content,
        childId,
        applyGridSettings,
      );

      if (localUpdate.didChange) {
        this.node = {
          ...this.node,
          content: localUpdate.nextNodes,
        };
      }
    }

    this.settings.dispatchPageConfigUpdated(this.pageConfig);
  }

  renderChildNode(node, renderOptions = {}) {
    if (typeof this.renderNodeFn !== "function") {
      return html``;
    }

    const childId = typeof node?.id === "string" ? node.id : "";

    return this.renderNodeFn(
      node,
      this.pageConfig,
      this.onPageConfigUpdated,
      this.renderNodeFn,
      {
        ...renderOptions,
        hostDataGridChildId: renderOptions.hostDataGridChildId ?? childId,
      },
    );
  }

  addSection(position) {
    const nextPageConfig = addSectionAfter(
      this.pageConfig,
      this.node,
      position,
    );
    this.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  moveSection(direction) {
    const nextPageConfig = moveSection(this.pageConfig, this.node, direction);
    this.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  deleteSection() {
    const nextPageConfig = removeSection(this.pageConfig, this.node);
    this.settings.dispatchPageConfigUpdated(nextPageConfig);
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
      return {
        id: createNodeId("image"),
        type: "image",
        url: "",
      };
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
      return {
        id: createNodeId("button"),
        type: "button",
        content: "Button",
      };
    }

    if (type === "embed") {
      return {
        id: createNodeId("embed"),
        type: "embed",
        html: "",
      };
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
        settings: {
          shared_component_id: "",
        },
        content: [],
      };
    }

    if (type === "container") {
      return {
        id: createNodeId("container"),
        type: "container",
        content: [],
      };
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
      return {
        id: createNodeId("gallery"),
        type: "gallery",
        images: [],
      };
    }

    if (type === "slider") {
      return {
        id: createNodeId("slider"),
        type: "slider",
        images: [],
      };
    }

    if (type === "navbar") {
      return {
        id: createNodeId("navbar"),
        type: "navbar",
        links: [],
      };
    }

    if (type === "captcha") {
      return {
        id: createNodeId("captcha"),
        type: "captcha",
        settings: {
          captchaChallengeUrl: "",
        },
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
    const pageContent = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];

    const contentUpdate = updateNodeContentById(
      pageContent,
      this.node?.id,
      nextContent,
    );
    if (!contentUpdate.didChange) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: contentUpdate.nextNodes,
    };

    this.node = {
      ...this.node,
      content: nextContent,
    };
    this.pageConfig = nextPageConfig;
    this.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  addChildBlock(type) {
    const childNodes = this.getChildNodes();
    const nextNode = this.getDefaultChildNode(type);
    this.updateSectionContent([...childNodes, nextNode]);
    this.isBlockPickerOpen = false;
  }

  moveChildBlock(direction) {
    const childId = this.getTrackedGridChildId();
    if (!childId) {
      return;
    }

    const childNodes = this.getChildNodes();
    const index = childNodes.findIndex((child) => child?.id === childId);
    if (index === -1) {
      return;
    }

    const targetIndex = direction === "backward" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= childNodes.length) {
      return;
    }

    const nextNodes = [...childNodes];
    const [movedNode] = nextNodes.splice(index, 1);
    nextNodes.splice(targetIndex, 0, movedNode);
    this.updateSectionContent(nextNodes);
    this.hoveredGridChildId = movedNode.id;
  }

  deleteTrackedChildBlock() {
    const childId = this.getTrackedGridChildId();
    if (!childId) {
      return;
    }

    const childNodes = this.getChildNodes();
    const nextNodes = childNodes.filter((child) => child?.id !== childId);
    if (nextNodes.length === childNodes.length) {
      return;
    }

    this.updateSectionContent(nextNodes);
    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
  }

  startSectionResize(event) {
    if (event.button !== 0) {
      return;
    }

    const containerEl = this.renderRoot?.querySelector(".container");
    if (!(containerEl instanceof HTMLElement)) {
      return;
    }

    const isVisualMode = this.settingAlignmentMode === "visual";
    const styles = getComputedStyle(containerEl);
    const rowSize =
      Number.parseFloat(styles.getPropertyValue("--section-grid-row-size")) ||
      GRID_EDITOR_ROW_SIZE;
    const rowGap = Number.parseFloat(styles.rowGap) || 0;
    const stepY = Math.max(1, rowSize + rowGap);
    const startRows = Math.max(
      1,
      Number.parseInt(this.settingGridRows, 10) || 1,
    );
    const startHeight =
      Number.parseFloat(String(this.settingFixedHeight || "").trim()) ||
      containerEl.getBoundingClientRect().height;

    this.activeSectionResizeState = {
      startY: event.clientY,
      isVisualMode,
      stepY,
      startRows,
      startHeight,
    };

    this.forceGridOverlayVisible = isVisualMode;
    window.addEventListener("pointermove", this.onSectionResizePointerMove);
    window.addEventListener("pointerup", this.onSectionResizePointerUp);
    window.addEventListener("pointercancel", this.onSectionResizePointerUp);

    event.preventDefault();
    event.stopPropagation();
  }

  onSectionResizePointerMove(event) {
    if (!this.activeSectionResizeState) {
      return;
    }

    const deltaY = event.clientY - this.activeSectionResizeState.startY;

    if (this.activeSectionResizeState.isVisualMode) {
      const deltaRows = Math.round(
        deltaY / this.activeSectionResizeState.stepY,
      );
      const nextRows = Math.max(
        1,
        this.activeSectionResizeState.startRows + deltaRows,
      );
      if (nextRows !== Number.parseInt(this.settingGridRows, 10)) {
        this.settings.updateSettingsState({
          settingGridRows: nextRows,
        });
      }
      return;
    }

    const nextHeight = Math.max(
      80,
      Math.round(this.activeSectionResizeState.startHeight + deltaY),
    );
    const nextValue = `${nextHeight}px`;
    if (nextValue !== this.settingFixedHeight) {
      this.settings.updateSettingsState({
        settingFixedHeight: nextValue,
      });
    }
  }

  onSectionResizePointerUp() {
    this.cleanupSectionResizeInteraction();
  }

  cleanupSectionResizeInteraction() {
    this.activeSectionResizeState = null;
    this.forceGridOverlayVisible = false;
    window.removeEventListener("pointermove", this.onSectionResizePointerMove);
    window.removeEventListener("pointerup", this.onSectionResizePointerUp);
    window.removeEventListener("pointercancel", this.onSectionResizePointerUp);
  }

  async loadSharedComponentOptions() {
    if (this.didLoadSharedComponentOptions) {
      return;
    }

    this.didLoadSharedComponentOptions = true;

    try {
      const components = await dataLayer.listSharedComponents();
      this.sharedComponentOptions = Array.isArray(components)
        ? components
            .map((component) => ({
              label: component?.title || component?.id || "Untitled",
              value: component?.id || "",
            }))
            .filter((component) => component.value)
        : [];
    } catch (error) {
      console.error(error);
      this.sharedComponentOptions = [];
    }

    if (!this.replaceWithSharedComponentId && this.sharedComponentOptions[0]) {
      this.replaceWithSharedComponentId = this.sharedComponentOptions[0].value;
    }
  }

  replaceCurrentSectionWithSharedComponent() {
    const sharedComponentId = String(
      this.replaceWithSharedComponentId || "",
    ).trim();
    if (
      !sharedComponentId ||
      !Array.isArray(this.pageConfig?.content) ||
      !this.node?.id
    ) {
      return;
    }

    let didReplace = false;
    const nextContent = this.pageConfig.content.map((currentNode) => {
      if (currentNode?.id !== this.node.id) {
        return currentNode;
      }

      didReplace = true;
      return {
        id: this.node.id,
        type: "shared",
        settings: {
          shared_component_id: sharedComponentId,
        },
        content: [],
      };
    });

    if (!didReplace) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: nextContent,
    };

    this.settings.dispatchPageConfigUpdated(nextPageConfig);
    this.closeSettingsEditor();
  }

  onFocusNodeRequest(event) {
    const requestedNodeId = String(event?.detail?.nodeId || "");
    if (!requestedNodeId || String(this.node?.id || "") !== requestedNodeId) {
      return;
    }

    this.scrollIntoView({ block: "center", behavior: "smooth" });
    void this.openSectionSettings();
  }

  async openSectionSettings() {
    if (this.supportsReplaceWithSharedComponent()) {
      await this.loadSharedComponentOptions();
    }

    this.settings.syncSettingsStateFromNode(this.getDefaultSettingsState());

    this.openSettingsEditor({
      tabs: [
        {
          id: "general",
          label: "General",
        },
        {
          id: "design",
          label: "Design",
        },
      ],
      content: (tab) => {
        if (tab === "general") {
          const options = [
            { label: "Normal", value: "normal" },
            { label: "Full width", value: "full" },
            { label: "Custom", value: "custom" },
          ];

          return html`<div>
            <settings-section
              title="Width"
              ?overridden=${this.settings.hasAnyOverriddenKeys(
                "settingWidth",
                "settingWidthCustomValue",
              )}
            >
              <editor-radio-button
                .options=${options}
                .value=${this.settingWidth}
                @change=${(e) => {
                  this.settings.updateSettingsState({
                    settingWidth: e.detail.value,
                  });
                }}
              ></editor-radio-button>

              ${this.settingWidth === "custom"
                ? html`<editor-text-input
                    label="Custom Width"
                    placeholder="1024px"
                    .value=${this.settingWidthCustomValue}
                    @change=${(e) => {
                      this.settings.updateSettingsState({
                        settingWidthCustomValue: e.detail.value,
                      });
                    }}
                  ></editor-text-input>`
                : null}
            </settings-section>
            <settings-section
              title="Sizing"
              ?overridden=${this.settings.hasAnyOverriddenKeys(
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
                .value=${this.settingSizing}
                @change=${(e) => {
                  this.settings.updateSettingsState({
                    settingSizing: e.detail.value,
                  });
                }}
              ></editor-radio-button>

              ${this.settingSizing === "custom"
                ? html`
                    <editor-padding-input
                      .value=${{
                        top: this.settingPaddingTop,
                        right: this.settingPaddingRight,
                        bottom: this.settingPaddingBottom,
                        left: this.settingPaddingLeft,
                      }}
                      @change=${(e) => {
                        const paddingValues = e.detail.value || {};
                        this.settings.updateSettingsState({
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
              ?overridden=${this.settings.hasAnyOverriddenKeys(
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
                  mode: this.settingAlignmentMode,
                  gap: this.settingGap,
                  rowHeight: this.settingRowHeight,
                  flexDirection: this.settingFlexDirection,
                  flexHorizontal: this.settingFlexHorizontal,
                  flexVertical: this.settingFlexVertical,
                  flexJustifyContent: this.settingFlexJustifyContent,
                  flexAlignItems: this.settingFlexAlignItems,
                  flexAlignContent: this.settingFlexAlignContent,
                  gridRows: this.settingGridRows,
                  gridColumns: this.settingGridColumns,
                  gridHorizontal: this.settingGridHorizontal,
                  gridVertical: this.settingGridVertical,
                  gridJustifyItems: this.settingGridJustifyItems,
                  gridAlignItems: this.settingGridAlignItems,
                  gridJustifyContent: this.settingGridJustifyContent,
                  gridAlignContent: this.settingGridAlignContent,
                  otherAlignment: this.settingOtherAlignment,
                }}
                @alignment-change=${(e) => {
                  const next = e.detail.value;
                  this.settings.updateSettingsState({
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
                  this.showGridPreviewOverlay = Boolean(e.detail?.visible);
                }}
              ></editor-alignment-options>
              ${this.settingAlignmentMode !== "visual"
                ? html`
                    <editor-text-input
                      label="Fixed min height"
                      placeholder="320px"
                      .value=${this.settingFixedHeight}
                      @change=${(event) => {
                        this.settings.updateSettingsState({
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
                      .options=${this.sharedComponentOptions.length > 0
                        ? this.sharedComponentOptions
                        : [
                            {
                              label: "No shared components available",
                              value: "",
                            },
                          ]}
                      .value=${this.replaceWithSharedComponentId}
                      .disabled=${this.sharedComponentOptions.length === 0}
                      @change=${(event) => {
                        this.replaceWithSharedComponentId = event.detail.value;
                      }}
                    ></editor-select>
                    <editor-text-input
                      label="Or enter ID"
                      placeholder="navbar"
                      .value=${this.replaceWithSharedComponentId}
                      @change=${(event) => {
                        this.replaceWithSharedComponentId = event.detail.value;
                      }}
                    ></editor-text-input>
                    <editor-btn
                      style="light"
                      ?disabled=${!String(
                        this.replaceWithSharedComponentId || "",
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
              ?overridden=${this.settings.hasAnyOverriddenKeys(
                "settingBackgroundColor",
              )}
            >
              <editor-color-dots
                .options=${this.constructor.designColorVariables}
                .value=${this.settingBackgroundColor}
                label="Background color"
                @change=${(e) => {
                  this.settings.updateSettingsState({
                    settingBackgroundColor: e.detail.value,
                  });
                }}
              ></editor-color-dots>
            </settings-section>
            <settings-section
              title="Text color"
              ?overridden=${this.settings.hasAnyOverriddenKeys(
                "settingTextColor",
              )}
            >
              <editor-color-dots
                .options=${this.constructor.designColorVariables}
                .value=${this.settingTextColor}
                label="Text color"
                @change=${(e) => {
                  this.settings.updateSettingsState({
                    settingTextColor: e.detail.value,
                  });
                }}
              ></editor-color-dots>
            </settings-section>
          </div>`;
        }

        return html``;
      },
    });
  }

  onSectionPointerDown(event) {
    if (this.isSettingsEditorOpen) {
      return;
    }

    const activeSettingsOwner = getActiveSettingsOwner();
    const activeOwnerNodeId = String(activeSettingsOwner?.node?.id || "");
    const isActiveOwnerDescendant = this.hasDescendantNodeId(activeOwnerNodeId);
    if (
      activeSettingsOwner &&
      activeSettingsOwner !== this &&
      !isActiveOwnerDescendant
    ) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

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

    if (shouldIgnore) {
      return;
    }

    void this.openSectionSettings();
  }

  render() {
    const childNodes = this.getChildNodes();
    const isGridChildEditingEnabled = this.isGridChildEditingEnabled();
    const { columns: previewColumns, rows: previewRows } =
      this.getGridDimensions();

    const widthStyle =
      this.settingWidth === "custom" && this.settingWidthCustomValue
        ? `max-width: ${this.settingWidthCustomValue};`
        : "";
    const backgroundColorStyle = this.settingBackgroundColor
      ? `background-color: var(${this.settingBackgroundColor});`
      : "";
    const textColorStyle = this.settingTextColor
      ? `color: var(${this.settingTextColor});`
      : "";
    const childBackgroundVarStyle = this.settingBackgroundColor
      ? `--owb-section-child-background-color: var(${this.settingBackgroundColor});`
      : "";
    const childTextVarStyle = this.settingTextColor
      ? `--owb-section-child-text-color: var(${this.settingTextColor});`
      : "";
    const layoutStyleParts = [];

    if (this.settingAlignmentMode === "flex" && !isGridChildEditingEnabled) {
      layoutStyleParts.push("display: flex;");
      layoutStyleParts.push(`flex-direction: ${this.settingFlexDirection};`);
      layoutStyleParts.push(
        `justify-content: ${this.settingFlexJustifyContent};`,
      );
      layoutStyleParts.push(`align-items: ${this.settingFlexAlignItems};`);
      if (this.settingGap) {
        layoutStyleParts.push(`gap: ${this.settingGap};`);
      }
    }

    if (this.settingAlignmentMode === "grid") {
      layoutStyleParts.push("display: grid;");
      layoutStyleParts.push(
        `grid-template-columns: repeat(${this.settingGridColumns || 1}, minmax(0, 1fr));`,
      );
      layoutStyleParts.push(
        `grid-template-rows: repeat(${this.settingGridRows || 1}, auto);`,
      );
      layoutStyleParts.push(
        `justify-content: ${this.settingGridJustifyContent};`,
      );
      layoutStyleParts.push(`align-items: ${this.settingGridAlignItems};`);
      layoutStyleParts.push(`align-content: ${this.settingGridAlignContent};`);
      if (this.settingGap) {
        layoutStyleParts.push(`gap: ${this.settingGap};`);
      }
    }

    if (this.settingAlignmentMode === "other") {
      layoutStyleParts.push(`display: ${this.settingOtherAlignment};`);
    }

    const layoutStyle = layoutStyleParts.join("");
    const previewCellCount = Math.min(previewColumns * previewRows, 2500);
    const shouldRenderGridOverlay =
      ((this.isSettingsEditorOpen && this.showGridPreviewOverlay) ||
        this.forceGridOverlayVisible) &&
      (this.settingAlignmentMode === "grid" ||
        this.settingAlignmentMode === "visual");
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
      ? `--section-grid-columns: ${previewColumns}; --section-grid-rows: ${previewRows}; --section-grid-gap: ${this.settingGap || "0px"}; --section-grid-row-size: ${rowHeight};`
      : "";
    const fixedHeightStyle =
      this.settingAlignmentMode === "visual" || !this.settingFixedHeight
        ? ""
        : `min-height: ${this.settingFixedHeight};`;
    const sectionPaddingStyle = `--section-padding-top: ${sectionPadding.top}; --section-padding-right: ${sectionPadding.right}; --section-padding-bottom: ${sectionPadding.bottom}; --section-padding-left: ${sectionPadding.left};`;
    const sectionClassName =
      `${this.isSettingsEditorOpen ? "is-settings-open" : ""} ${isFocusedHandleStateLocked ? "is-focus-locked" : ""}`.trim();

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
        ${this.node?.type === "shared"
          ? html`<span class="shared-badge">Shared Component</span>`
          : ""}
        <div
          class="container is-${this
            .settingWidth}-width ${isGridChildEditingEnabled
            ? `is-grid-child-editing is-${this.settingAlignmentMode}-mode`
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
                        this.blockPickerType = "text";
                        this.isBlockPickerOpen = true;
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

                    return this.renderNodeFn(
                      child,
                      this.pageConfig,
                      this.onPageConfigUpdated,
                      this.renderNodeFn,
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
                  style=${`--grid-preview-columns: ${previewColumns}; --grid-preview-rows: ${previewRows}; --grid-preview-gap: ${this.settingGap || "0px"};`}
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
              this.isBlockPickerOpen = !this.isBlockPickerOpen;
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
        ${this.isBlockPickerOpen
          ? html`
              <div class="section-block-picker">
                <editor-select
                  label="Block type"
                  .options=${this.getInsertBlockOptions()}
                  .value=${this.blockPickerType}
                  @change=${(event) => {
                    this.blockPickerType = event.detail.value;
                  }}
                ></editor-select>
                <div class="section-block-picker-actions">
                  <editor-btn
                    style="primary"
                    @click=${() => this.addChildBlock(this.blockPickerType)}
                    >Insert block</editor-btn
                  >
                  <editor-btn
                    style="light"
                    @click=${() => {
                      this.isBlockPickerOpen = false;
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

export class OwbSectionEditor extends OwbLayoutContainerEditor {
  shouldShowAddSectionButtons() {
    return true;
  }

  shouldShowSectionReorderButtons() {
    return true;
  }

  shouldShowDeleteButton() {
    return true;
  }

  supportsReplaceWithSharedComponent() {
    return true;
  }
}

function updateNodeSettingsById(nodes, targetNodeId, settingsUpdater) {
  let didChange = false;

  const nextNodes = nodes.map((currentNode) => {
    if (!currentNode || typeof currentNode !== "object") {
      return currentNode;
    }

    if (currentNode.id === targetNodeId) {
      const currentSettings =
        currentNode.settings && typeof currentNode.settings === "object"
          ? currentNode.settings
          : {};
      const nextSettings = settingsUpdater(currentSettings);

      if (nextSettings === currentSettings) {
        return currentNode;
      }

      didChange = true;
      const nextNode = {
        ...currentNode,
      };

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
        return {
          ...currentNode,
          content: nestedUpdate.nextNodes,
        };
      }
    }

    return currentNode;
  });

  return {
    nextNodes,
    didChange,
  };
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

  return {
    ...pageConfig,
    content: nextContent,
  };
}

export function moveSection(pageConfig, node, direction) {
  const content = Array.isArray(pageConfig?.content)
    ? [...pageConfig.content]
    : [];
  const index = content.indexOf(node);

  if (index === -1) {
    return pageConfig;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= content.length) {
    return pageConfig;
  }

  const [movedSection] = content.splice(index, 1);
  content.splice(targetIndex, 0, movedSection);

  return {
    ...pageConfig,
    content,
  };
}

export function removeSection(pageConfig, node) {
  const content = Array.isArray(pageConfig?.content) ? pageConfig.content : [];

  return {
    ...pageConfig,
    content: content.filter((currentNode) => currentNode !== node),
  };
}

OwbSection.editorPlugin = {};

export const editorRenderSection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-section-editor
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-section-editor>`;
};

customElements.define("owb-section-editor", OwbSectionEditor);

if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}
