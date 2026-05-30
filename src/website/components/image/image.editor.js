import { LitElement, html, unsafeCSS } from "lit";
import { Image as ImageIcon, createElement } from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import { OwbImage, getImageMode } from "./image.js";

OwbImage.editorPlugin = {};

class SiteImage extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    imageUrl: { type: String },
    imageSizeMode: { type: String },
    imageClickAction: { type: String },
    imageLinkUrl: { type: String },
    imageLinkTarget: { type: String },
  };

  static styles = [super.styles];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.imageUrl = "";
    this.imageSizeMode = "contained";
    this.imageClickAction = "none";
    this.imageLinkUrl = "";
    this.imageLinkTarget = "current";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.imageUrl =
        this.node && typeof this.node.url === "string" ? this.node.url : "";

      this.syncSettingsStateFromNode({
        imageSizeMode: "contained",
        imageClickAction: "none",
        imageLinkUrl: "",
        imageLinkTarget: "current",
      });
    }
  }

  updateImageSizeMode(nextMode) {
    const normalizedMode = getImageMode(nextMode);

    const nextState = {
      imageSizeMode: normalizedMode,
    };

    if (normalizedMode === "full-width") {
      nextState.gridRowSpan = 1;
    }

    this.updateSettingsState(nextState);
  }

  updateNodeUrl(nodes, targetNodeId, nextUrl) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "image") {
        return {
          ...currentNode,
          url: nextUrl,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeUrl(
            currentNode.content,
            targetNodeId,
            nextUrl,
          ),
        };
      }

      return currentNode;
    });
  }

  updateImageUrl(nextUrl) {
    this.imageUrl = nextUrl;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeUrl(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextUrl,
      ),
    };

    this.node = {
      ...this.node,
      url: nextUrl,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  previewImageUrl(nextUrl) {
    this.imageUrl = nextUrl;
  }

  openImageSettings() {
    this.syncSettingsStateFromNode({
      imageSizeMode: "contained",
      imageClickAction: "none",
      imageLinkUrl: "",
      imageLinkTarget: "current",
    });

    this.openSettingsEditor({
      tabs: [{ id: "general", label: "General" }],
      content: () => html`
        <div>
          <settings-section title="Image">
                      <settings-section title="Image" ?overridden=${this.hasAnyOverriddenKeys("imageSizeMode", "url")}>
            <editor-text-input
              label="URL"
              placeholder="https://example.com/image.jpg"
              .value=${this.imageUrl}
              @input=${(e) => this.previewImageUrl(e.detail.value)}
              @change=${(e) => this.updateImageUrl(e.detail.value)}
            ></editor-text-input>

            <editor-radio-button
              .options=${[
                { label: "Full width", value: "full-width" },
                { label: "Contained", value: "contained" },
                { label: "Cover", value: "cover" },
              ]}
              .value=${this.imageSizeMode}
              @change=${(e) => this.updateImageSizeMode(e.detail.value)}
            ></editor-radio-button>
          </settings-section>
          <settings-section title="Interaction">
                      <settings-section title="Interaction" ?overridden=${this.hasAnyOverriddenKeys("imageClickAction", "imageLinkUrl", "imageLinkTarget")}>
            <editor-radio-button
              .options=${[
                { label: "Do nothing", value: "none" },
                { label: "Open a link", value: "link" },
                { label: "Open image in lightbox", value: "lightbox" },
              ]}
              .value=${this.imageClickAction}
              @change=${(event) => {
                this.updateSettingsState({
                  imageClickAction: event.detail.value,
                });
              }}
            ></editor-radio-button>

            ${
              this.imageClickAction === "link"
                ? html`
                    <editor-text-input
                      label="Link URL"
                      placeholder="https://example.com"
                      .value=${this.imageLinkUrl}
                      @change=${(event) => {
                        this.updateSettingsState({
                          imageLinkUrl: event.detail.value,
                        });
                      }}
                    ></editor-text-input>
                    <editor-radio-button
                      .options=${[
                        { label: "Open in current page", value: "current" },
                        { label: "Open in new tab", value: "new" },
                      ]}
                      .value=${this.imageLinkTarget}
                      @change=${(event) => {
                        this.updateSettingsState({
                          imageLinkTarget: event.detail.value,
                        });
                      }}
                    ></editor-radio-button>
                  `
                : null
            }
          </settings-section>
        </div>
      `,
    });
  }

  openImageSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openImageSettings();
  }

  // Spacing and custom CSS are rendered inside owb-image, not in site-image.
  applySpacingToRenderRoot() {}
  applyCustomCssToRenderRoot() {}

  render() {
    const settings = {
      imageSizeMode: this.imageSizeMode,
      imageClickAction: this.imageClickAction,
      imageLinkUrl: this.imageLinkUrl,
      imageLinkTarget: this.imageLinkTarget,
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
      <owb-image
        data-editor-block
        @pointerdown=${() => this.openImageSettingsIfNeeded()}
        class="${this.isSettingsEditorOpen ? "is-settings-open" : ""}"
        .settings=${settings}
      ></owb-image>
    `;
  }
}

export const editorRenderImage = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-image
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-image>`;
};

if (!customElements.get("site-image")) {
  customElements.define("site-image", SiteImage);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
