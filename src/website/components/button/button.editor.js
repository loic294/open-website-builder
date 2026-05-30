import { html } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";
import { OwbButton, SIZE_OPTIONS } from "./button.js";

// Signal to OwbButton that it is running inside the editor.
OwbButton.editorPlugin = {};

class SiteButton extends withVariantConfig(EditorComponent) {
  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    buttonText: { type: String },
    buttonLink: { type: String },
    buttonSize: { type: String },
    buttonTheme: { type: String },
    buttonVariant: { type: String },
    buttonType: { type: String },
    buttonShape: { type: String },
    buttonRadiusCustom: { type: String },
    buttonPaddingTop: { type: String },
    buttonPaddingRight: { type: String },
    buttonPaddingBottom: { type: String },
    buttonPaddingLeft: { type: String },
  };

  static styles = super.styles;

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.buttonText = "Button";
    this.buttonLink = "";
    this.buttonSize = "m";
    this.buttonTheme = "primary";
    this.buttonVariant = "filled";
    this.buttonType = "link";
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
        buttonType: "link",
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
      buttonType: "link",
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
              <settings-section
                title="Content"
                ?overridden=${this.hasAnyOverriddenKeys(
                  "buttonText",
                  "buttonLink",
                  "buttonType",
                )}
              >
                <editor-text-input
                  label="Label"
                  .value=${this.buttonText}
                  @input=${(event) => this.updateButtonText(event.detail.value)}
                  @change=${(event) =>
                    this.updateButtonText(event.detail.value)}
                ></editor-text-input>
                <editor-text-input
                  label="Link"
                  placeholder="https://example.com"
                  .value=${this.buttonLink}
                  .disabled=${this.buttonType !== "link"}
                  @change=${(event) =>
                    this.updateSettingsState({
                      buttonLink: event.detail.value,
                    })}
                ></editor-text-input>
                <editor-select
                  label="Button action"
                  .value=${this.buttonType}
                  .options=${[
                    { label: "Link", value: "link" },
                    { label: "Normal button", value: "button" },
                    { label: "Submit button", value: "submit" },
                  ]}
                  @change=${(event) =>
                    this.updateSettingsState({
                      buttonType: event.detail.value,
                    })}
                ></editor-select>
              </settings-section>
              <settings-section title="Size">
                <settings-section
                  title="Size"
                  ?overridden=${this.hasAnyOverriddenKeys(
                    "buttonSize",
                    "buttonPaddingTop",
                    "buttonPaddingRight",
                    "buttonPaddingBottom",
                    "buttonPaddingLeft",
                  )}
                >
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
              </settings-section></settings-section
            >
          `;
        }

        if (tab === "design") {
          return html`
            <settings-section title="Theme">
              <settings-section
                title="Theme"
                ?overridden=${this.hasAnyOverriddenKeys("buttonTheme")}
              >
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
                <settings-section
                  title="Style"
                  ?overridden=${this.hasAnyOverriddenKeys("buttonVariant")}
                >
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
                  <settings-section
                    title="Shape"
                    ?overridden=${this.hasAnyOverriddenKeys(
                      "buttonShape",
                      "buttonRadiusCustom",
                    )}
                  >
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
                </settings-section></settings-section
              ></settings-section
            >
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

  render() {
    // Delegate all visual rendering to OwbButton. SiteButton only provides the
    // editor chrome (data-editor-block wrapper, settings overlay lifecycle).
    const settings = {
      buttonLink: this.buttonLink,
      buttonSize: this.buttonSize,
      buttonTheme: this.buttonTheme,
      buttonVariant: this.buttonVariant,
      buttonType: this.buttonType,
      buttonShape: this.buttonShape,
      buttonRadiusCustom: this.buttonRadiusCustom,
      buttonPaddingTop: this.buttonPaddingTop,
      buttonPaddingRight: this.buttonPaddingRight,
      buttonPaddingBottom: this.buttonPaddingBottom,
      buttonPaddingLeft: this.buttonPaddingLeft,
    };

    return html`
      <div
        data-editor-block
        @pointerdown=${() => this.openButtonSettingsIfNeeded()}
        class="button-block ${this.isSettingsEditorOpen
          ? "is-settings-open"
          : ""}"
      >
        <owb-button
          .content=${this.buttonText}
          .settings=${settings}
        ></owb-button>
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
