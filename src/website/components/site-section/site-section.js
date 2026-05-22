import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import {
  ArrowDown,
  ArrowUp,
  Trash,
  Pencil,
  createElement,
} from "lucide/dist/cjs/lucide";
import styles from "./styles.css?inline";

export const defaultSectionConfig = {
  type: "section",
  content: [],
};

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

    settingWidth: { type: String },
    settingWidthCustomValue: { type: String },
    settingBackgroundColor: { type: String },
    settingTextColor: { type: String },
    settingAlignmentMode: { type: String },
    settingGap: { type: String },
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
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.settingWidth = "normal";
    this.settingWidthCustomValue = "";
    this.settingBackgroundColor = "";
    this.settingTextColor = "";
    this.settingAlignmentMode = "visual";
    this.settingGap = "";
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
  }

  closeSettingsEditor() {
    super.closeSettingsEditor();
    this.showGridPreviewOverlay = false;
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.syncSettingsStateFromNode({
        settingWidth: "normal",
        settingWidthCustomValue: "",
        settingBackgroundColor: "",
        settingTextColor: "",
        settingAlignmentMode: "visual",
        settingGap: "",
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

    if (this.settingAlignmentMode === "flex") {
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
    const previewColumns = Math.max(
      1,
      Number.parseInt(this.settingGridColumns, 10) || 1,
    );
    const previewRows = Math.max(
      1,
      Number.parseInt(this.settingGridRows, 10) || 1,
    );
    const previewCellCount = Math.min(previewColumns * previewRows, 250);
    const shouldRenderGridOverlay =
      this.isSettingsEditorOpen &&
      this.showGridPreviewOverlay &&
      (this.settingAlignmentMode === "grid" ||
        this.settingAlignmentMode === "visual");

    return html`<div>
      <section
        class="${this.isSettingsEditorOpen ? "is-settings-open" : ""}"
        style="${backgroundColorStyle}${textColorStyle}"
      >
        <editor-btn
          style="primary"
          class="add-section-button"
          @click=${() => this.addSection("before")}
        >
          Add section
        </editor-btn>
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
        <div
          class="container is-${this.settingWidth}-width"
          style="${widthStyle}${layoutStyle}"
        >
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
          <slot></slot>
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
) => {
  const children = Array.isArray(node.content) ? node.content : [];
  return html`<site-section
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  >
    ${children.map((child) =>
      renderNode(child, pageConfig, onPageConfigUpdated, renderNode),
    )}
  </site-section>`;
};

customElements.define("site-section", SiteSection);
