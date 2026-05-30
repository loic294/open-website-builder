import { html, unsafeCSS } from "lit";

import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";
import { OwbGallery, defaultGalleryConfig } from "./gallery.js";

export { defaultGalleryConfig };

OwbGallery.editorPlugin = {};

const FORMAT_OPTIONS = [
  { label: "Square", value: "1 / 1" },
  { label: "3x2", value: "3 / 2" },
  { label: "4x3", value: "4 / 3" },
  { label: "16x9", value: "16 / 9" },
  { label: "2x3", value: "2 / 3" },
  { label: "3x4", value: "3 / 4" },
  { label: "9x16", value: "9 / 16" },
];

class SiteGallery extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    galleryImages: { type: Array },
    galleryColumns: { type: Number },
    galleryFormat: { type: String },
    galleryGap: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.galleryImages = [];
    this.galleryColumns = 3;
    this.galleryFormat = "1 / 1";
    this.galleryGap = "8px";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.galleryImages = Array.isArray(this.node?.images)
        ? this.node.images
        : [];

      this.syncSettingsStateFromNode({
        galleryColumns: 3,
        galleryFormat: "1 / 1",
        galleryGap: "8px",
      });
    }
  }

  updateNodeImages(nodes, targetNodeId, nextImages) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "gallery") {
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

    this.galleryImages = nextImages;

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

  openGallerySettings() {
    this.syncSettingsStateFromNode({
      galleryColumns: 3,
      galleryFormat: "1 / 1",
      galleryGap: "8px",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <settings-section title="Photos">
          <textarea
            class="gallery-textarea"
            .value=${this.galleryImages.join("\n")}
            placeholder="One image URL per line"
            @input=${(event) => this.updateImagesFromText(event.target.value)}
          ></textarea>
        </settings-section>
        <settings-section title="Layout">
          <settings-section
            title="Layout"
            ?overridden=${this.hasAnyOverriddenKeys(
              "galleryColumns",
              "galleryFormat",
              "galleryGap",
            )}
          >
            <editor-text-input
              type="number"
              label="Columns"
              min=${1}
              max=${12}
              .value=${String(this.galleryColumns)}
              @change=${(event) =>
                this.updateSettingsState({
                  galleryColumns: Math.max(
                    1,
                    Math.min(12, Number.parseInt(event.detail.value, 10) || 1),
                  ),
                })}
            ></editor-text-input>
            <editor-select
              label="Picture format"
              .value=${this.galleryFormat}
              .options=${FORMAT_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              @change=${(event) =>
                this.updateSettingsState({
                  galleryFormat: event.detail.value,
                })}
            ></editor-select>
            <editor-text-input
              label="Gap"
              placeholder="8px"
              .value=${this.galleryGap}
              @change=${(event) =>
                this.updateSettingsState({ galleryGap: event.detail.value })}
            ></editor-text-input>
          </settings-section>
        </settings-section>
      `,
    });
  }

  openGallerySettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }
    this.openGallerySettings();
  }

  // Spacing and custom CSS are rendered inside owb-gallery, not in site-gallery.
  applySpacingToRenderRoot() {}
  applyCustomCssToRenderRoot() {}

  render() {
    const settings = {
      galleryColumns: this.galleryColumns,
      galleryGap: this.galleryGap,
      galleryFormat: this.galleryFormat,
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
        @pointerdown=${() => this.openGallerySettingsIfNeeded()}
        class="gallery-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <owb-gallery
          .images=${this.galleryImages}
          .settings=${settings}
        ></owb-gallery>
      </div>
    `;
  }
}

export const editorRenderGallery = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-gallery
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-gallery>`;
};

if (!customElements.get("site-gallery")) {
  customElements.define("site-gallery", SiteGallery);
}

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}
