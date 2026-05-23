import { html, unsafeCSS } from "lit";
import { Pencil, createElement } from "lucide/dist/cjs/lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
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

class SiteButton extends EditorComponent {
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

  getSizeStyle() {
    if (this.buttonSize === "xs") {
      return "--button-padding-y: 0.28rem; --button-padding-x: 0.65rem; --button-font-size: 0.78rem;";
    }

    if (this.buttonSize === "sm") {
      return "--button-padding-y: 0.4rem; --button-padding-x: 0.8rem; --button-font-size: 0.85rem;";
    }

    if (this.buttonSize === "m") {
      return "--button-padding-y: 0.58rem; --button-padding-x: 1rem; --button-font-size: 0.95rem;";
    }

    if (this.buttonSize === "l") {
      return "--button-padding-y: 0.72rem; --button-padding-x: 1.25rem; --button-font-size: 1.05rem;";
    }

    if (this.buttonSize === "xl") {
      return "--button-padding-y: 0.9rem; --button-padding-x: 1.5rem; --button-font-size: 1.15rem;";
    }

    const top = this.buttonPaddingTop || "0.58rem";
    const right = this.buttonPaddingRight || "1rem";
    const bottom = this.buttonPaddingBottom || "0.58rem";
    const left = this.buttonPaddingLeft || "1rem";

    return `--button-padding-y: ${top}; --button-padding-x: ${right}; --button-font-size: 0.95rem; padding: ${top} ${right} ${bottom} ${left};`;
  }

  getShapeRadius() {
    if (this.buttonShape === "rounded") {
      return "9999px";
    }

    if (this.buttonShape === "square") {
      return "0px";
    }

    return this.buttonRadiusCustom || "12px";
  }

  render() {
    const themeClass = `theme-${this.buttonTheme}`;
    const variantClass = `variant-${this.buttonVariant}`;
    const shapeRadius = this.getShapeRadius();
    const sizeStyle = this.getSizeStyle();

    return html`
      <div
        data-editor-block
        class="button-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <div class="button-toolbar">
          <editor-btn style="light" @click=${() => this.openButtonSettings()}
            >${createElement(Pencil)} Edit button</editor-btn
          >
        </div>
        <div class="button-preview-wrap">
          <a
            class="site-button ${themeClass} ${variantClass}"
            href=${this.buttonLink || "#"}
            style=${`${sizeStyle} --button-radius: ${shapeRadius};`}
            @click=${(event) => {
              if (!this.buttonLink) {
                event.preventDefault();
              }
            }}
            >${this.buttonText || "Button"}</a
          >
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

customElements.define("site-button", SiteButton);
