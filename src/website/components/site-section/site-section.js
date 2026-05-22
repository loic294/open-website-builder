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
  }

  updated(changedProperties) {
    if (changedProperties.has("node")) {
      this.syncSettingsStateFromNode({
        settingWidth: "normal",
        settingWidthCustomValue: "",
        settingBackgroundColor: "",
        settingTextColor: "",
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

  openSectionSettings() {
    this.syncSettingsStateFromNode({
      settingWidth: "normal",
      settingWidthCustomValue: "",
      settingBackgroundColor: "",
      settingTextColor: "",
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
        ? `width: ${this.settingWidthCustomValue};`
        : "";
    const backgroundColorStyle = this.settingBackgroundColor
      ? `background-color: var(${this.settingBackgroundColor});`
      : "";
    const textColorStyle = this.settingTextColor
      ? `color: var(${this.settingTextColor});`
      : "";

    return html`<div>
      <section
        class="${this.isSettingsEditorOpen ? "is-settings-open" : ""}"
        style="${widthStyle}${backgroundColorStyle}${textColorStyle}"
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
          <editor-btn style="light text-danger"
            >${createElement(Trash)}</editor-btn
          >
        </div>
        <div
          class="container is-${this.settingWidth}-width"
          style="${widthStyle}"
        >
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
