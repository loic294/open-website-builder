import { LitElement, html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { buildEditorCustomCss } from "../../utils/custom-css.js";
import { getSpacingStyleBlock } from "../../utils/spacing.js";
import { buildResponsiveCss } from "../../utils/responsive.js";

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

const BUTTON_TONES = {
  primary: [
    "var(--website-primary-color, #116dff)",
    "var(--website-text-light-color, #ffffff)",
  ],
  secondary: [
    "var(--website-secondary-color, #f97316)",
    "var(--website-text-light-color, #ffffff)",
  ],
  light: [
    "var(--website-light-color, #f5f5f5)",
    "var(--website-text-dark-color, #111827)",
  ],
  dark: [
    "var(--website-dark-color, #111827)",
    "var(--website-text-light-color, #ffffff)",
  ],
  muted: [
    "var(--website-muted-color, #6b7280)",
    "var(--website-text-light-color, #ffffff)",
  ],
};

export function getButtonVisualDeclarations(settings = {}) {
  const size = String(settings.buttonSize || "m");
  const theme = String(settings.buttonTheme || "primary");
  const variant = String(settings.buttonVariant || "filled");
  const shape = String(settings.buttonShape || "rounded");
  const radius = getButtonShapeRadius(
    shape,
    String(settings.buttonRadiusCustom || "12px"),
  );
  const [tone, toneText] = BUTTON_TONES[theme] || BUTTON_TONES.primary;
  const declarations = getButtonSizeStyle(size, settings)
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean);

  declarations.push(
    `--button-radius: ${radius}`,
    `--button-tone: ${tone}`,
    `--button-tone-text: ${toneText}`,
    `border-radius: ${radius}`,
  );

  if (variant === "border") {
    declarations.push(
      "background: transparent",
      `border-color: ${tone}`,
      `color: ${tone}`,
    );
  } else if (variant === "ghost") {
    declarations.push(
      `background: color-mix(in srgb, ${tone} 14%, transparent)`,
      "border-color: transparent",
      `color: ${tone}`,
    );
  } else {
    declarations.push(
      `background: ${tone}`,
      "border-color: transparent",
      `color: ${toneText}`,
    );
  }

  return declarations;
}

export function buildResponsiveButtonCss(settings = {}) {
  return buildResponsiveCss(settings, (effectiveSettings) => ({
    selector: ".site-button",
    declarations: getButtonVisualDeclarations(effectiveSettings),
  }));
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
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.content = "Button";
    this.settings = {};
    this.node = null;
    this.pageConfig = null;
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
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
    if (OwbButton.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbButton.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbButton.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbButton.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.dispatchEvent(
      new CustomEvent("page-config-updated", {
        detail: nextPageConfig,
        bubbles: true,
        composed: true,
      }),
    );
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
    const spacingCss = getSpacingStyleBlock(settings);
    const sizeStyle = getButtonSizeStyle(size, settings);
    const radius = getButtonShapeRadius(shape, customRadius);
    const responsiveCss = buildResponsiveButtonCss(settings);

    const isEditorMode = OwbButton.editorPlugin !== null;
    const renderedCustomCss = buildEditorCustomCss(customCss, isEditorMode);

    return html`
      <link rel="stylesheet" href="/owb-styles/button.css" />
      ${responsiveCss ? unsafeHTML(`<style>${responsiveCss}</style>`) : null}
      ${
        spacingCss
          ? unsafeHTML(`<style data-spacing>${spacingCss}</style>`)
          : null
      }
      ${
        renderedCustomCss
          ? unsafeHTML(`<style>${renderedCustomCss}</style>`)
          : null
      }
      <div
        class="button-block${
          isEditorMode && this.isSettingsOpen ? " is-settings-open" : ""
        }"
        data-editor-block=${isEditorMode ? "" : nothing}
        @pointerdown=${
          isEditorMode
            ? () => OwbButton.editorPlugin?.onPointerDown?.(this)
            : nothing
        }
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
