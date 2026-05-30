import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

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

export { SIZE_OPTIONS };

export function getButtonSizeStyle(size, settings = {}) {
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

export function getButtonShapeRadius(shape, customRadius) {
  if (shape === "rounded") {
    return "9999px";
  }

  if (shape === "square") {
    return "0px";
  }

  return customRadius || "12px";
}

export function renderButtonPreview({
  content,
  link,
  theme,
  variant,
  sizeStyle,
  radius,
  buttonType,
  preventEmptyLink = false,
}) {
  if (buttonType === "submit" || buttonType === "button") {
    return html`<button
      class="site-button theme-${theme} variant-${variant}"
      type=${buttonType}
      style=${`${sizeStyle} --button-radius: ${radius};`}
    >
      ${content || "Button"}
    </button>`;
  }

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

export class OwbButton extends LitElement {
  static editorPlugin = null;

  static properties = {
    // Content and settings — set by the publish pipeline or editor plugin
    content: { type: String },
    settings: { type: Object },
    // Editor-facing props — declared here so the editor plugin can set them;
    // harmless in the published bundle where they are never assigned.
    node: { type: Object },
    pageConfig: { type: Object },
  };

  constructor() {
    super();
    this.content = "Button";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
  }

  connectedCallback() {
    const dataProps = this.getAttribute("data-props");
    if (dataProps) {
      try {
        const props = JSON.parse(dataProps);
        if (props.content !== undefined) this.content = props.content;
        if (props.settings !== undefined) this.settings = props.settings;
      } catch (e) {}
    }
    super.connectedCallback();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbButton.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const settings = this.settings ?? {};
    const content = this.content ?? "Button";
    const link = String(settings.buttonLink || "").trim();
    const size = String(settings.buttonSize || "m");
    const theme = String(settings.buttonTheme || "primary");
    const variant = String(settings.buttonVariant || "filled");
    const buttonType = String(settings.buttonType || "link");
    const shape = String(settings.buttonShape || "rounded");
    const customRadius = String(settings.buttonRadiusCustom || "12px");
    const customCss = String(settings.customCss || "").trim();
    const sizeStyle = getButtonSizeStyle(size, settings);
    const radius = getButtonShapeRadius(shape, customRadius);

    const isEditorMode = OwbButton.editorPlugin !== null;

    return html`
      <link rel="stylesheet" href="/owb-styles/button.css" />
      ${customCss ? unsafeHTML(`<style>${customCss}</style>`) : null}
      <div
        class="button-block${isEditorMode && this.isSettingsEditorOpen
          ? " is-settings-open"
          : ""}"
        data-editor-block=${isEditorMode || undefined}
        @pointerdown=${isEditorMode
          ? () => OwbButton.editorPlugin?.onPointerDown?.(this)
          : undefined}
      >
        <div class="button-preview-wrap">
          ${renderButtonPreview({
            content,
            link,
            theme,
            variant,
            sizeStyle,
            radius,
            buttonType,
            preventEmptyLink: isEditorMode,
          })}
        </div>
      </div>
    `;
  }
}
