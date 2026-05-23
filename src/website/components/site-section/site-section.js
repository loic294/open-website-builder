import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import {
  ArrowDown,
  ArrowUp,
  Trash,
  Pencil,
  Move,
  createElement,
} from "lucide/dist/cjs/lucide";
import styles from "./styles.css?inline";

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

export class SiteSection extends EditorComponent {
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

    settingWidth: { type: String },
    settingWidthCustomValue: { type: String },
    settingBackgroundColor: { type: String },
    settingTextColor: { type: String },
    settingAlignmentMode: { type: String },
    settingGap: { type: String },
    settingRowHeight: { type: String },
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
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.renderNodeFn = null;
    this.onPageConfigUpdated = null;
    this.settingWidth = "normal";
    this.settingWidthCustomValue = "";
    this.settingBackgroundColor = "";
    this.settingTextColor = "";
    this.settingAlignmentMode = "visual";
    this.settingGap = "";
    this.settingRowHeight = `${GRID_EDITOR_ROW_SIZE}px`;
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
    this.activeGridPointerState = null;
    this.draftGridPlacements = {};
    this.globalHandleFrame = null;
    this.onGridPointerMove = this.onGridPointerMove.bind(this);
    this.onGridPointerUp = this.onGridPointerUp.bind(this);
  }

  closeSettingsEditor() {
    super.closeSettingsEditor();
    this.showGridPreviewOverlay = false;
    this.hoveredGridChildId = "";
    this.globalGridHandlePosition = null;
    this.cleanupGridPointerInteraction();
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.draftGridPlacements = {};
      this.cleanupGridPointerInteraction();

      this.syncSettingsStateFromNode({
        settingWidth: "normal",
        settingWidthCustomValue: "",
        settingBackgroundColor: "",
        settingTextColor: "",
        settingAlignmentMode: "visual",
        settingGap: "",
        settingRowHeight: `${GRID_EDITOR_ROW_SIZE}px`,
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
      });
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
    this.cleanupGridPointerInteraction();
    super.disconnectedCallback();
  }

  getTrackedGridChildId() {
    return (
      this.activeGridPointerState?.childId || this.hoveredGridChildId || ""
    );
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

    this.dispatchPageConfigUpdated(this.pageConfig);
  }

  renderChildNode(node) {
    if (typeof this.renderNodeFn !== "function") {
      return html``;
    }

    return this.renderNodeFn(
      node,
      this.pageConfig,
      this.onPageConfigUpdated,
      this.renderNodeFn,
    );
  }

  addSection(position) {
    const nextPageConfig = addSectionAfter(
      this.pageConfig,
      this.node,
      position,
    );
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  moveSection(direction) {
    const nextPageConfig = moveSection(this.pageConfig, this.node, direction);
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  deleteSection() {
    const nextPageConfig = removeSection(this.pageConfig, this.node);
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openSectionSettings() {
    this.syncSettingsStateFromNode({
      settingWidth: "normal",
      settingWidthCustomValue: "",
      settingBackgroundColor: "",
      settingTextColor: "",
      settingAlignmentMode: "visual",
      settingGap: "",
      settingRowHeight: `${GRID_EDITOR_ROW_SIZE}px`,
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
    });

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
            <settings-section title="Width">
              <editor-radio-button
                .options=${options}
                .value=${this.settingWidth}
                @change=${(e) => {
                  this.updateSettingsState({ settingWidth: e.detail.value });
                }}
              ></editor-radio-button>

              ${this.settingWidth === "custom"
                ? html`<editor-text-input
                    label="Custom Width"
                    placeholder="1024px"
                    .value=${this.settingWidthCustomValue}
                    @change=${(e) => {
                      this.updateSettingsState({
                        settingWidthCustomValue: e.detail.value,
                      });
                    }}
                  ></editor-text-input>`
                : null}
            </settings-section>
            <settings-section title="Alignment">
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
                  this.updateSettingsState({
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
            </settings-section>
          </div>`;
        }

        if (tab === "design") {
          return html`<div>
            <settings-section title="Background color">
              <editor-color-dots
                .options=${SiteSection.designColorVariables}
                .value=${this.settingBackgroundColor}
                label="Background color"
                @change=${(e) => {
                  this.updateSettingsState({
                    settingBackgroundColor: e.detail.value,
                  });
                }}
              ></editor-color-dots>
            </settings-section>
            <settings-section title="Text color">
              <editor-color-dots
                .options=${SiteSection.designColorVariables}
                .value=${this.settingTextColor}
                label="Text color"
                @change=${(e) => {
                  this.updateSettingsState({
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
      this.isSettingsEditorOpen &&
      this.showGridPreviewOverlay &&
      (this.settingAlignmentMode === "grid" ||
        this.settingAlignmentMode === "visual");
    const rowHeight = this.getSanitizedRowHeightValue();
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
    const shouldRenderGlobalGridHandles =
      isGridChildEditingEnabled &&
      Boolean(trackedGridChildId) &&
      Boolean(this.globalGridHandlePosition);
    const gridEditingStyle = isGridChildEditingEnabled
      ? `--section-grid-columns: ${previewColumns}; --section-grid-rows: ${previewRows}; --section-grid-gap: ${this.settingGap || "0px"}; --section-grid-row-size: ${rowHeight};`
      : "";

    return html`<div>
      <section
        class="${this.isSettingsEditorOpen ? "is-settings-open" : ""}"
        style="${backgroundColorStyle}${textColorStyle}"
        @pointermove=${(event) => this.onGridContainerPointerMove(event)}
        @pointerleave=${() => this.onSectionPointerLeave()}
      >
        <editor-btn
          style="primary"
          class="add-section-button"
          @click=${() => this.addSection("before")}
        >
          Add section
        </editor-btn>
        <div
          class="container is-${this
            .settingWidth}-width ${isGridChildEditingEnabled
            ? `is-grid-child-editing is-${this.settingAlignmentMode}-mode`
            : ""}"
          style="${widthStyle}${layoutStyle}${gridEditingStyle}"
        >
          ${isGridChildEditingEnabled
            ? html`
                ${childNodes.map((child, index) => {
                  const childId = typeof child?.id === "string" ? child.id : "";
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
          <editor-btn style="light" @click=${() => this.openSectionSettings()}
            >${createElement(Pencil)} Edit</editor-btn
          >
          <editor-btn
            style="light text-danger"
            title="Delete section"
            @click=${() => this.deleteSection()}
            >${createElement(Trash)}</editor-btn
          >
        </div>
        <editor-btn
          style="primary"
          class="add-section-button bottom"
          @click=${() => this.addSection("after")}
        >
          Add section
        </editor-btn>
      </section>
    </div>`;
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
    content: [
      {
        id: `text-${timestamp}`,
        type: "text",
        content: `New section ${timestamp}`,
      },
    ],
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

export const editorRenderSiteSection = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-section
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .renderNodeFn=${renderNode}
    .onPageConfigUpdated=${onPageConfigUpdated}
    @page-config-updated=${onPageConfigUpdated}
  ></site-section>`;
};

customElements.define("site-section", SiteSection);
