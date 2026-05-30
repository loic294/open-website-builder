import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";
import { OwbSlider, defaultSliderConfig } from "./slider.js";

export { defaultSliderConfig };

OwbSlider.editorPlugin = {};

const FORMAT_OPTIONS = [
  { label: "Original", value: "auto" },
  { label: "Square", value: "1 / 1" },
  { label: "3x2", value: "3 / 2" },
  { label: "4x3", value: "4 / 3" },
  { label: "16x9", value: "16 / 9" },
  { label: "2x3", value: "2 / 3" },
  { label: "3x4", value: "3 / 4" },
  { label: "9x16", value: "9 / 16" },
];

class SiteSlider extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    sliderImages: { type: Array },
    sliderFormat: { type: String },
    sliderItemWidth: { type: String },
    sliderHeight: { type: String },
    sliderGap: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.sliderImages = [];
    this.sliderFormat = "3 / 2";
    this.sliderItemWidth = "80%";
    this.sliderHeight = "400px";
    this.sliderGap = "12px";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.sliderImages = Array.isArray(this.node?.images)
        ? this.node.images
        : [];

      this.syncSettingsStateFromNode({
        sliderFormat: "3 / 2",
        sliderItemWidth: "80%",
        sliderHeight: "400px",
        sliderGap: "12px",
      });
    }
  }

  updateNodeImages(nodes, targetNodeId, nextImages) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "slider") {
        return { ...currentNode, images: nextImages };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeImages(
            currentNode.content,
            targetNodeId,
            nextImages,
          ),
        };
      }

      return currentNode;
    });
  }

  updateImagesFromText(nextValue) {
    const nextImages = String(nextValue || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    this.sliderImages = nextImages;
    this.currentIndex = 0;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeImages(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextImages,
      ),
    };

    this.node = { ...this.node, images: nextImages };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openSliderSettings() {
    this.syncSettingsStateFromNode({
      sliderFormat: "3 / 2",
      sliderItemWidth: "80%",
      sliderHeight: "400px",
      sliderGap: "12px",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section title="Photos">
          <textarea
            class="slider-textarea"
            .value=${this.sliderImages.join("\n")}
            placeholder="One image URL per line"
            @input=${(event) => this.updateImagesFromText(event.target.value)}
          ></textarea>
        </settings-section>
        <settings-section
          title="Layout"
          ?overridden=${this.hasAnyOverriddenKeys(
            "sliderFormat",
            "sliderItemWidth",
            "sliderHeight",
            "sliderGap",
          )}
        >
          <editor-select
            label="Picture format"
            .value=${this.sliderFormat}
            .options=${FORMAT_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            @change=${(event) =>
              this.updateSettingsState({ sliderFormat: event.detail.value })}
          ></editor-select>
          ${this.sliderFormat === "auto"
            ? html`
                <editor-text-input
                  label="Height"
                  placeholder="400px"
                  .value=${this.sliderHeight}
                  @change=${(event) =>
                    this.updateSettingsState({
                      sliderHeight: event.detail.value,
                    })}
                ></editor-text-input>
              `
            : html`
                <editor-text-input
                  label="Item width"
                  placeholder="80%"
                  .value=${this.sliderItemWidth}
                  @change=${(event) =>
                    this.updateSettingsState({
                      sliderItemWidth: event.detail.value,
                    })}
                ></editor-text-input>
              `}
          <editor-text-input
            label="Gap"
            placeholder="12px"
            .value=${this.sliderGap}
            @change=${(event) =>
              this.updateSettingsState({ sliderGap: event.detail.value })}
          ></editor-text-input>
        </settings-section>
      `,
    });
  }

  openSliderSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }
    this.openSliderSettings();
  }

  // Spacing and custom CSS are rendered inside owb-slider, not in site-slider.
  applySpacingToRenderRoot() {}
  applyCustomCssToRenderRoot() {}

  render() {
    const settings = {
      sliderFormat: this.sliderFormat,
      sliderItemWidth: this.sliderItemWidth,
      sliderHeight: this.sliderHeight,
      sliderGap: this.sliderGap,
      settingSpacingPaddingTop: this.settingSpacingPaddingTop,
      settingSpacingPaddingRight: this.settingSpacingPaddingRight,
      settingSpacingPaddingBottom: this.settingSpacingPaddingBottom,
      settingSpacingPaddingLeft: this.settingSpacingPaddingLeft,
      settingSpacingMarginTop: this.settingSpacingMarginTop,
      settingSpacingMarginRight: this.settingSpacingMarginRight,
      settingSpacingMarginBottom: this.settingSpacingMarginBottom,
      settingSpacingMarginLeft: this.settingSpacingMarginLeft,
      settingSpacingBorderRadius: this.settingSpacingBorderRadius,
      settingSpacingBackgroundColor: this.settingSpacingBackgroundColor,
      settingSpacingTextColor: this.settingSpacingTextColor,
      settingSpacingHidden: this.settingSpacingHidden,
      customCss: this.settingCustomCss,
    };
    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openSliderSettingsIfNeeded()}
        class="slider-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <owb-slider
          .images=${this.sliderImages}
          .settings=${settings}
        ></owb-slider>
      </div>
    `;
  }
}

export const editorRenderSlider = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-slider
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-slider>`;
};

if (!customElements.get("site-slider")) {
  customElements.define("site-slider", SiteSlider);
}

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}
