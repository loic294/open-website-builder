import { LitElement, html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import styles from "./styles.css?inline";

export const defaultButtonConfig = {
  type: "button",
  content: "Button",
};

const SIZE_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "M", value: "m" },
  { label: "L", value: "l" },
  { label: "XL", value: "xl" },
  { label: "Custom", value: "custom" },
];

function getButtonSizeStyle(size, settings = {}) {
  if (size === "xs") {
    return "--button-padding-y: 0.28rem; --button-padding-x: 0.65rem; --button-font-size: 0.78rem;";
  }

  if (size === "sm") {
    return "--button-padding-y: 0.4rem; --button-padding-x: 0.8rem; --button-font-size: 0.85rem;";
  }

  if (size === "m") {
    return "--button-padding-y: 0.58rem; --button-padding-x: 1rem; --button-font-size: 0.95rem;";
  }

  if (size === "l") {
    return "--button-padding-y: 0.72rem; --button-padding-x: 1.25rem; --button-font-size: 1.05rem;";
  }

  if (size === "xl") {
    return "--button-padding-y: 1.6rem; --button-padding-x: 2rem; --button-font-size: 1.5rem;";
  }

  const top = settings.buttonPaddingTop || "0.58rem";
  const right = settings.buttonPaddingRight || "1rem";
  const bottom = settings.buttonPaddingBottom || "0.58rem";
  const left = settings.buttonPaddingLeft || "1rem";

  return `--button-padding-y: ${top}; --button-padding-x: ${right}; --button-font-size: 0.95rem; padding: ${top} ${right} ${bottom} ${left};`;
}

function getButtonShapeRadius(shape, customRadius) {
  if (shape === "rounded") {
    return "9999px";
  }

  if (shape === "square") {
    return "0px";
  }

  return customRadius || "12px";
}

function renderButtonPreview({
  content,
  link,
  theme,
  variant,
  sizeStyle,
  radius,
  preventEmptyLink = false,
}) {
  return html`<a
    class="site-button theme-${theme} variant-${variant}"
    href=${link || "#"}
    style=${`${sizeStyle} --button-radius: ${radius};`}
    @click=${(event) => {
      if (preventEmptyLink && !link) {
        event.preventDefault();
      }
    }}
    >${content || "Button"}</a
  >`;
}

class SiteButton extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    buttonText: { type: String },
    buttonLink: { type: String },
    buttonSize: { type: String },
    buttonTheme: { type: String },
    buttonVariant: { type: String },
    buttonShape: { type: String },
    buttonRadiusCustom: { type: String },
    buttonPaddingTop: { type: String },
    buttonPaddingRight: { type: String },
    buttonPaddingBottom: { type: String },
    buttonPaddingLeft: { type: String },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.buttonText = "Button";
    this.buttonLink = "";
    this.buttonSize = "m";
    this.buttonTheme = "primary";
    this.buttonVariant = "filled";
    this.buttonShape = "rounded";
    this.buttonRadiusCustom = "12px";
    this.buttonPaddingTop = "";
    this.buttonPaddingRight = "";
    this.buttonPaddingBottom = "";
    this.buttonPaddingLeft = "";
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.buttonText =
        this.node && typeof this.node.content === "string"
          ? this.node.content
          : "Button";

      this.syncSettingsStateFromNode({
        buttonLink: "",
        buttonSize: "m",
        buttonTheme: "primary",
        buttonVariant: "filled",
        buttonShape: "rounded",
        buttonRadiusCustom: "12px",
        buttonPaddingTop: "",
        buttonPaddingRight: "",
        buttonPaddingBottom: "",
        buttonPaddingLeft: "",
      });
    }
  }

  updateNodeContent(nodes, targetNodeId, nextContent) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "button") {
        return {
          ...currentNode,
          content: nextContent,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeContent(
            currentNode.content,
            targetNodeId,
            nextContent,
          ),
        };
      }

      return currentNode;
    });
  }

  updateButtonText(nextText) {
    this.buttonText = nextText;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeContent(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextText,
      ),
    };

    this.node = {
      ...this.node,
      content: nextText,
    };
    this.pageConfig = nextPageConfig;
    this.dispatchPageConfigUpdated(nextPageConfig);
  }

  openButtonSettings() {
    this.syncSettingsStateFromNode({
      buttonLink: "",
      buttonSize: "m",
      buttonTheme: "primary",
      buttonVariant: "filled",
      buttonShape: "rounded",
      buttonRadiusCustom: "12px",
      buttonPaddingTop: "",
      buttonPaddingRight: "",
      buttonPaddingBottom: "",
      buttonPaddingLeft: "",
    });

    this.openSettingsEditor({
      tabs: [
        { id: "general", label: "General" },
        { id: "design", label: "Design" },
      ],
      content: (tab) => {
        if (tab === "general") {
          return html`
            <settings-section title="Content">
              <editor-text-input
                label="Label"
                .value=${this.buttonText}
                @input=${(event) => this.updateButtonText(event.detail.value)}
                @change=${(event) => this.updateButtonText(event.detail.value)}
              ></editor-text-input>
              <editor-text-input
                label="Link"
                placeholder="https://example.com"
                .value=${this.buttonLink}
                @change=${(event) =>
                  this.updateSettingsState({
                    buttonLink: event.detail.value,
                  })}
              ></editor-text-input>
            </settings-section>
            <settings-section title="Size">
              <editor-radio-button
                .options=${SIZE_OPTIONS}
                .value=${this.buttonSize}
                @change=${(event) =>
                  this.updateSettingsState({
                    buttonSize: event.detail.value,
                  })}
              ></editor-radio-button>
              ${this.buttonSize === "custom"
                ? html`
                    <editor-padding-input
                      .value=${{
                        top: this.buttonPaddingTop,
                        right: this.buttonPaddingRight,
                        bottom: this.buttonPaddingBottom,
                        left: this.buttonPaddingLeft,
                      }}
                      @change=${(event) => {
                        const value = event.detail.value || {};
                        this.updateSettingsState({
                          buttonPaddingTop: value.top || "",
                          buttonPaddingRight: value.right || "",
                          buttonPaddingBottom: value.bottom || "",
                          buttonPaddingLeft: value.left || "",
                        });
                      }}
                    ></editor-padding-input>
                  `
                : null}
            </settings-section>
          `;
        }

        if (tab === "design") {
          return html`
            <settings-section title="Theme">
              <editor-select
                label="Theme color"
                .value=${this.buttonTheme}
                .options=${[
                  { label: "Primary", value: "primary" },
                  { label: "Secondary", value: "secondary" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                  { label: "Muted", value: "muted" },
                ]}
                @change=${(event) =>
                  this.updateSettingsState({
                    buttonTheme: event.detail.value,
                  })}
              ></editor-select>
            </settings-section>
            <settings-section title="Style">
              <editor-radio-button
                .options=${[
                  { label: "Filled", value: "filled" },
                  { label: "Border", value: "border" },
                  { label: "Ghost", value: "ghost" },
                ]}
                .value=${this.buttonVariant}
                @change=${(event) =>
                  this.updateSettingsState({
                    buttonVariant: event.detail.value,
                  })}
              ></editor-radio-button>
            </settings-section>
            <settings-section title="Shape">
              <editor-radio-button
                .options=${[
                  { label: "Rounded", value: "rounded" },
                  { label: "Square", value: "square" },
                  { label: "Border radius", value: "custom" },
                ]}
                .value=${this.buttonShape}
                @change=${(event) =>
                  this.updateSettingsState({
                    buttonShape: event.detail.value,
                  })}
              ></editor-radio-button>
              ${this.buttonShape === "custom"
                ? html`
                    <editor-text-input
                      label="Radius"
                      placeholder="12px"
                      .value=${this.buttonRadiusCustom}
                      @change=${(event) =>
                        this.updateSettingsState({
                          buttonRadiusCustom: event.detail.value,
                        })}
                    ></editor-text-input>
                  `
                : null}
            </settings-section>
          `;
        }

        return html``;
      },
    });
  }

  openButtonSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openButtonSettings();
  }

  getSizeStyle() {
    return getButtonSizeStyle(this.buttonSize, {
      buttonPaddingTop: this.buttonPaddingTop,
      buttonPaddingRight: this.buttonPaddingRight,
      buttonPaddingBottom: this.buttonPaddingBottom,
      buttonPaddingLeft: this.buttonPaddingLeft,
    });
  }

  getShapeRadius() {
    return getButtonShapeRadius(this.buttonShape, this.buttonRadiusCustom);
  }

  render() {
    const themeClass = `theme-${this.buttonTheme}`;
    const variantClass = `variant-${this.buttonVariant}`;
    const shapeRadius = this.getShapeRadius();
    const sizeStyle = this.getSizeStyle();

    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openButtonSettingsIfNeeded()}
        class="button-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <div class="button-preview-wrap">
          ${renderButtonPreview({
            content: this.buttonText,
            link: this.buttonLink,
            theme: this.buttonTheme,
            variant: this.buttonVariant,
            sizeStyle,
            radius: shapeRadius,
            preventEmptyLink: true,
          })}
        </div>
      </div>
    `;
  }
}

export const editorRenderButton = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<site-button
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></site-button>`;
};

class OwbButton extends withVariantConfig(LitElement) {
  static styles = unsafeCSS(styles);

  render() {
    const { content = "Button", settings = {} } = this.config;
    const link = String(settings.buttonLink || "").trim();
    const size = String(settings.buttonSize || "m");
    const theme = String(settings.buttonTheme || "primary");
    const variant = String(settings.buttonVariant || "filled");
    const shape = String(settings.buttonShape || "rounded");
    const customRadius = String(settings.buttonRadiusCustom || "12px");
    const sizeStyle = getButtonSizeStyle(size, settings);
    const radius = getButtonShapeRadius(shape, customRadius);

    return html`
      <div class="button-block">
        <div class="button-preview-wrap">
          ${renderButtonPreview({
            content,
            link,
            theme,
            variant,
            sizeStyle,
            radius,
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("site-button")) {
  customElements.define("site-button", SiteButton);
}

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}
