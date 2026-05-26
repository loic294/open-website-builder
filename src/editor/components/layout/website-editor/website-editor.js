import { LitElement, html, css, unsafeCSS } from "lit";
import {
  Monitor,
  Tablet,
  Smartphone,
  RectangleHorizontal,
  RectangleVertical,
  createElement,
} from "lucide";

import "../../ui/button/button.js";
import "../../ui/radio-button/radio-button.js";
import { renderNode } from "../../../core/render-node.js";
import { dataLayer } from "../../../data/data-layer.js";

import "../../../../website/components/site-section/site-section.js";
import "../../../../website/components/text/text.js";
import "../../../../website/components/image/image.js";
import "../../../../website/components/button/button.js";
import "../../../../website/components/embed/embed.js";
import "../../../../website/components/social-media/social-media.js";
import "../../../../website/components/gallery/gallery.js";
import "../../../../website/components/collection/collection.js";
import "../../../../website/components/collection-content/collection-content.js";

import baseStyle from "../../../../website/styles/base.css?inline";
import styles from "./website-editor-styles.css?inline";

class WebsiteEditor extends LitElement {
  static properties = {
    pageConfig: { state: true },
    publishStatus: { state: true },
    activeView: { state: true },
    activeSize: { state: true },
    activeOrientation: { state: true },
    currentSelection: { state: true },
  };

  static styles = [unsafeCSS(baseStyle), unsafeCSS(styles), css``];

  constructor() {
    super();
    this.pageConfig = null;
    this.didLoadConfig = false;
    this.publishStatus = "";
    this.activeView = "editor";
    this.activeSize = "desktop";
    this.activeOrientation = "vertical";
    this.currentSelection = { type: "page", pageId: "index" };
    this.collectionMetadataFieldOptions = [];
  }

  buildCollectionConfigForSave(config = this.pageConfig) {
    const fieldsEntries = Object.entries(config?.fields || {}).reduce(
      (acc, [fieldName, fieldConfig]) => {
        const normalizedName = String(fieldName || "").trim();
        if (!normalizedName) {
          return acc;
        }

        const valueType = fieldConfig?.type === "array" ? "array" : "string";
        const isRequired = Boolean(fieldConfig?.required);

        if (valueType === "array") {
          acc[normalizedName] = {
            type: "array",
            items: { type: "string" },
            ...(isRequired ? { required: true } : {}),
          };
          return acc;
        }

        acc[normalizedName] = {
          type: "string",
          ...(isRequired ? { required: true } : {}),
        };
        return acc;
      },
      {},
    );

    const allowlist = Array.isArray(config?.collectionMetadataAllowlist)
      ? config.collectionMetadataAllowlist
          .map((fieldName) => String(fieldName || "").trim())
          .filter(Boolean)
      : [];

    const nextConfig = {
      id: String(
        config?.id || this.currentSelection?.collectionId || "",
      ).trim(),
      title: String(config?.title || "Collection").trim() || "Collection",
      fields: fieldsEntries,
      content: Array.isArray(config?.content) ? config.content : [],
      collectionMetadataAllowlist: [...new Set(allowlist)],
    };

    return nextConfig;
  }

  async saveCollectionConfig(config = this.pageConfig) {
    const collectionId = this.currentSelection?.collectionId;
    if (!collectionId) {
      return;
    }

    await dataLayer.saveCollectionConfig(
      collectionId,
      this.buildCollectionConfigForSave(config),
    );
  }

  async applyCollectionConfigUpdate(patch = {}) {
    const nextConfig = {
      ...this.pageConfig,
      ...patch,
    };

    this.pageConfig = nextConfig;

    try {
      await this.saveCollectionConfig(nextConfig);
    } catch (error) {
      console.error(error);
    }
  }

  viewOptions = [
    { label: "Editor", value: "editor" },
    { label: "Preview", value: "preview" },
    { label: "Settings", value: "settings" },
  ];

  sizeOptions = [
    { label: html`${createElement(Monitor)}`, value: "desktop" },
    { label: html`${createElement(Tablet)}`, value: "tablet" },
    { label: html`${createElement(Smartphone)}`, value: "mobile" },
  ];

  orientationOptions = [
    {
      label: html`${createElement(RectangleHorizontal)} Horizontal`,
      value: "horizontal",
    },
    {
      label: html`${createElement(RectangleVertical)} Vertical`,
      value: "vertical",
    },
  ];

  async connectedCallback() {
    super.connectedCallback();

    this.onRouteChanged = async () => {
      await this.loadSelectionFromRoute();
    };

    window.addEventListener("popstate", this.onRouteChanged);
    window.addEventListener("editor-route-change", this.onRouteChanged);

    if (!this.didLoadConfig) {
      this.didLoadConfig = true;
      await this.loadSelectionFromRoute();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this.onRouteChanged);
    window.removeEventListener("editor-route-change", this.onRouteChanged);
  }

  getRouteSelection() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") || "page";

    if (type === "collection") {
      return {
        type: "collection",
        collectionId: params.get("collectionId") || "",
        itemId: params.get("itemId") || "",
      };
    }

    if (type === "collection-config") {
      return {
        type: "collection-config",
        collectionId: params.get("collectionId") || "",
      };
    }

    if (type === "shared") {
      return {
        type: "shared",
        componentId: params.get("componentId") || "",
      };
    }

    return {
      type: "page",
      pageId: params.get("pageId") || "index",
    };
  }

  async loadSelectionFromRoute() {
    const selection = this.getRouteSelection();
    this.currentSelection = selection;

    try {
      if (selection.type === "collection-config") {
        const collectionConfig = await dataLayer.getCollectionConfig(
          selection.collectionId,
        );
        await this.loadCollectionMetadataFieldOptions(selection.collectionId);

        this.pageConfig = {
          ...collectionConfig,
          type: "collection-config",
          id: collectionConfig?.id || selection.collectionId,
          title:
            collectionConfig?.title || selection.collectionId || "Collection",
          url: `/collections/${selection.collectionId}/_config.json`,
          content: Array.isArray(collectionConfig?.content)
            ? collectionConfig.content
            : [],
        };
        return;
      }

      if (selection.type === "collection") {
        const item = await dataLayer.getCollectionItemContent(
          selection.collectionId,
          selection.itemId,
        );

        this.pageConfig = {
          ...item,
          id: item?.id || selection.itemId,
          title: item?.title || selection.itemId || "Collection item",
          url:
            item?.url ||
            `/collections/${selection.collectionId}/${selection.itemId}`,
          content: Array.isArray(item?.content) ? item.content : [],
        };
        return;
      }

      if (selection.type === "shared") {
        const componentConfig = await dataLayer.getComponentConfig(
          selection.componentId,
        );

        this.pageConfig = {
          ...componentConfig,
          type: "shared",
          id: componentConfig?.id || selection.componentId,
          title:
            componentConfig?.title ||
            selection.componentId ||
            "Shared component",
          url: `/shared/${selection.componentId}`,
          content: Array.isArray(componentConfig?.content)
            ? componentConfig.content
            : [],
        };
        return;
      }

      this.pageConfig = await dataLayer.getPageConfig(selection.pageId);
    } catch (error) {
      console.error(error);
      this.pageConfig = {
        type: "page",
        id:
          selection.type === "collection-config"
            ? selection.collectionId || "collection"
            : selection.type === "collection"
              ? selection.itemId || "item"
              : selection.type === "shared"
                ? selection.componentId || "component"
                : selection.pageId || "home",
        title:
          selection.type === "collection-config"
            ? selection.collectionId || "Collection"
            : selection.type === "collection"
              ? selection.itemId || "Collection item"
              : selection.type === "shared"
                ? selection.componentId || "Shared component"
                : "Home",
        url:
          selection.type === "collection-config"
            ? `/collections/${selection.collectionId}/_config.json`
            : selection.type === "collection"
              ? `/collections/${selection.collectionId}/${selection.itemId}`
              : selection.type === "shared"
                ? `/shared/${selection.componentId}`
                : "/",
        content: [],
      };
    }
  }

  onPageConfigUpdated = async (event) => {
    event.stopPropagation();
    this.pageConfig = event.detail;

    try {
      if (this.currentSelection?.type === "collection-config") {
        await this.saveCollectionConfig(this.pageConfig);
      } else if (this.currentSelection?.type === "collection") {
        await dataLayer.updateCollectionItem(
          this.currentSelection.collectionId,
          this.currentSelection.itemId,
          this.pageConfig,
        );
      } else if (this.currentSelection?.type === "shared") {
        await dataLayer.saveComponentConfig(
          this.currentSelection.componentId,
          this.pageConfig,
        );
      } else {
        await dataLayer.savePageConfig(
          this.currentSelection?.pageId || "index",
          this.pageConfig,
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  onPublishClick = async () => {
    this.publishStatus = "Publishing...";
    try {
      const result = await dataLayer.publishSite();
      const pagesCount = Array.isArray(result?.pages) ? result.pages.length : 0;
      this.publishStatus = `Published ${pagesCount} page(s)`;
    } catch (error) {
      console.error(error);
      this.publishStatus =
        error instanceof Error
          ? `Publish failed: ${error.message}`
          : "Publish failed";
    }
  };

  onActiveViewChange = (event) => {
    this.activeView = event.detail.value;
  };

  onActiveSizeChange = (event) => {
    this.activeSize = event.detail.value;
  };

  onActiveOrientationChange = (event) => {
    this.activeOrientation = event.detail.value;
  };

  normalizeKeySegment(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  flattenObjectFields(value, prefix = "") {
    if (!value || typeof value !== "object") {
      return [];
    }

    const entries = [];
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = this.normalizeKeySegment(key);
      if (!normalizedKey) {
        continue;
      }

      const path = prefix ? `${prefix}.${normalizedKey}` : normalizedKey;

      if (Array.isArray(nested)) {
        entries.push({ path, type: "array", value: nested });
        continue;
      }

      if (nested && typeof nested === "object") {
        entries.push(...this.flattenObjectFields(nested, path));
        continue;
      }

      entries.push({ path, type: "string", value: nested });
    }

    return entries;
  }

  getValueByPath(obj, path) {
    const segments = String(path || "")
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);

    let current = obj;
    for (const segment of segments) {
      if (!current || typeof current !== "object") {
        return undefined;
      }

      current = current[segment];
    }

    return current;
  }

  setValueByPath(obj, path, value) {
    const segments = String(path || "")
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!segments.length) {
      return;
    }

    let current = obj;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!current[segment] || typeof current[segment] !== "object") {
        current[segment] = {};
      }
      current = current[segment];
    }

    current[segments[segments.length - 1]] = value;
  }

  async loadCollectionMetadataFieldOptions(collectionId) {
    const normalizedCollectionId = String(collectionId || "").trim();
    if (!normalizedCollectionId) {
      this.collectionMetadataFieldOptions = [];
      return;
    }

    try {
      const metadataResult = await dataLayer.getCollectionItemsMetadata(
        normalizedCollectionId,
      );
      const items = Array.isArray(metadataResult?.items)
        ? metadataResult.items
        : [];

      const pathSet = new Set();
      for (const item of items) {
        const metadataRoot = item?.metadata?.metadata;
        const flattened = this.flattenObjectFields(metadataRoot || {});
        for (const entry of flattened) {
          pathSet.add(entry.path);
        }
      }

      this.collectionMetadataFieldOptions = [...pathSet].sort((a, b) =>
        a.localeCompare(b),
      );
    } catch (error) {
      console.error(error);
      this.collectionMetadataFieldOptions = [];
    }
  }

  getCollectionConfigFields() {
    const fields = this.pageConfig?.fields || {};
    return Object.entries(fields).map(([name, config]) => ({
      name,
      type: config?.type === "array" ? "array" : "string",
      required: Boolean(config?.required),
    }));
  }

  async addCollectionConfigField() {
    const fields = this.pageConfig?.fields || {};
    let index = 1;
    let candidate = `field_${index}`;
    while (fields[candidate]) {
      index += 1;
      candidate = `field_${index}`;
    }

    await this.applyCollectionConfigUpdate({
      fields: {
        ...fields,
        [candidate]: { type: "string", required: false },
      },
    });
  }

  async removeCollectionConfigField(fieldName) {
    const fields = { ...(this.pageConfig?.fields || {}) };
    delete fields[fieldName];
    await this.applyCollectionConfigUpdate({ fields });
  }

  async updateCollectionConfigFieldName(previousName, nextName) {
    const normalizedNextName = String(nextName || "").trim();
    const fields = { ...(this.pageConfig?.fields || {}) };
    if (!fields[previousName]) {
      return;
    }

    if (!normalizedNextName || normalizedNextName === previousName) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(fields, normalizedNextName)) {
      return;
    }

    fields[normalizedNextName] = fields[previousName];
    delete fields[previousName];
    await this.applyCollectionConfigUpdate({ fields });
  }

  async updateCollectionConfigFieldType(fieldName, type) {
    const fields = { ...(this.pageConfig?.fields || {}) };
    if (!fields[fieldName]) {
      return;
    }

    if (type === "array") {
      fields[fieldName] = {
        ...fields[fieldName],
        type: "array",
        items: { type: "string" },
      };
    } else {
      const required = Boolean(fields[fieldName]?.required);
      fields[fieldName] = {
        type: "string",
        ...(required ? { required: true } : {}),
      };
    }

    await this.applyCollectionConfigUpdate({ fields });
  }

  async updateCollectionConfigFieldRequired(fieldName, isRequired) {
    const fields = { ...(this.pageConfig?.fields || {}) };
    if (!fields[fieldName]) {
      return;
    }

    fields[fieldName] = {
      ...fields[fieldName],
      required: Boolean(isRequired),
    };

    await this.applyCollectionConfigUpdate({ fields });
  }

  async toggleCollectionAllowlistField(fieldName, enabled) {
    const allowlist = Array.isArray(
      this.pageConfig?.collectionMetadataAllowlist,
    )
      ? [...this.pageConfig.collectionMetadataAllowlist]
      : [];

    const normalizedFieldName = String(fieldName || "").trim();
    if (!normalizedFieldName) {
      return;
    }

    const withoutField = allowlist.filter(
      (item) => item !== normalizedFieldName,
    );
    const nextAllowlist = enabled
      ? [...withoutField, normalizedFieldName]
      : withoutField;

    await this.applyCollectionConfigUpdate({
      collectionMetadataAllowlist: [...new Set(nextAllowlist)],
    });
  }

  getCollectionItemMetadataFields() {
    const metadata =
      this.pageConfig?.metadata && typeof this.pageConfig.metadata === "object"
        ? this.pageConfig.metadata
        : {};

    return this.flattenObjectFields(metadata).map((entry) => ({
      ...entry,
      value: this.getValueByPath(metadata, entry.path),
    }));
  }

  async updateCollectionItemBaseField(fieldName, value) {
    if (this.currentSelection?.type !== "collection") {
      return;
    }

    const nextConfig = {
      ...this.pageConfig,
      [fieldName]: value,
    };

    this.pageConfig = nextConfig;

    try {
      await dataLayer.updateCollectionItem(
        this.currentSelection.collectionId,
        this.currentSelection.itemId,
        nextConfig,
      );
    } catch (error) {
      console.error(error);
    }
  }

  async updateCollectionItemMetadataField(path, rawValue, fieldType) {
    if (this.currentSelection?.type !== "collection") {
      return;
    }

    const nextMetadata = {
      ...(this.pageConfig?.metadata &&
      typeof this.pageConfig.metadata === "object"
        ? this.pageConfig.metadata
        : {}),
    };

    const nextValue =
      fieldType === "array"
        ? String(rawValue || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : String(rawValue || "");

    this.setValueByPath(nextMetadata, path, nextValue);

    const nextConfig = {
      ...this.pageConfig,
      metadata: nextMetadata,
    };

    this.pageConfig = nextConfig;

    try {
      await dataLayer.updateCollectionItem(
        this.currentSelection.collectionId,
        this.currentSelection.itemId,
        nextConfig,
      );
    } catch (error) {
      console.error(error);
    }
  }

  renderCollectionConfigSettings() {
    const fields = this.getCollectionConfigFields();
    const selectedAllowlist = Array.isArray(
      this.pageConfig?.collectionMetadataAllowlist,
    )
      ? this.pageConfig.collectionMetadataAllowlist
      : [];
    const metadataFieldOptions = this.collectionMetadataFieldOptions;

    return html`
      <div class="collection-config-settings">
        <div class="settings-section">
          <div class="settings-section-header">
            <h3>Fields</h3>
            <button
              type="button"
              class="settings-inline-button"
              @click=${() => this.addCollectionConfigField()}
            >
              Add field
            </button>
          </div>

          ${fields.length === 0
            ? html`<p class="settings-empty">No fields yet.</p>`
            : fields.map(
                (field) => html`
                  <div class="field-row">
                    <input
                      type="text"
                      class="settings-input"
                      .value=${field.name}
                      @change=${(event) =>
                        this.updateCollectionConfigFieldName(
                          field.name,
                          event.target.value,
                        )}
                    />
                    <select
                      class="settings-input"
                      .value=${field.type}
                      @change=${(event) =>
                        this.updateCollectionConfigFieldType(
                          field.name,
                          event.target.value,
                        )}
                    >
                      <option value="string">Text</option>
                      <option value="array">Array of text</option>
                    </select>
                    <label class="settings-checkbox-label">
                      <input
                        type="checkbox"
                        .checked=${field.required}
                        @change=${(event) =>
                          this.updateCollectionConfigFieldRequired(
                            field.name,
                            event.target.checked,
                          )}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      class="settings-danger-button"
                      @click=${() =>
                        this.removeCollectionConfigField(field.name)}
                    >
                      Remove
                    </button>
                  </div>
                `,
              )}
        </div>

        <div class="settings-section">
          <div class="settings-section-header">
            <h3>Metadata allowlist</h3>
          </div>
          ${metadataFieldOptions.length === 0
            ? html`<p class="settings-empty">
                No metadata fields discovered yet.
              </p>`
            : html`
                <div class="metadata-toggle-list">
                  ${metadataFieldOptions.map((fieldPath) => {
                    const isEnabled = selectedAllowlist.includes(fieldPath);
                    return html`
                      <label class="metadata-toggle-row">
                        <input
                          type="checkbox"
                          .checked=${isEnabled}
                          @change=${(event) =>
                            this.toggleCollectionAllowlistField(
                              fieldPath,
                              event.target.checked,
                            )}
                        />
                        <span>${fieldPath}</span>
                      </label>
                    `;
                  })}
                </div>
              `}
        </div>
      </div>
    `;
  }

  renderCollectionItemSettings() {
    const metadataFields = this.getCollectionItemMetadataFields();
    const tagsValue = Array.isArray(this.pageConfig?.tags)
      ? this.pageConfig.tags.join(", ")
      : "";

    return html`
      <div class="collection-config-settings">
        <div class="settings-section">
          <div class="settings-section-header">
            <h3>Collection item</h3>
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">Title</label>
            <input
              type="text"
              class="settings-input"
              .value=${String(this.pageConfig?.title || "")}
              @change=${(event) =>
                this.updateCollectionItemBaseField("title", event.target.value)}
            />
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">Excerpt</label>
            <textarea
              class="settings-textarea"
              rows="3"
              @change=${(event) =>
                this.updateCollectionItemBaseField(
                  "excerpt",
                  event.target.value,
                )}
            >
${String(this.pageConfig?.excerpt || "")}</textarea
            >
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">Tags</label>
            <input
              type="text"
              class="settings-input"
              .value=${tagsValue}
              @change=${(event) =>
                this.updateCollectionItemBaseField(
                  "tags",
                  String(event.target.value || "")
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                )}
            />
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">URL</label>
            <input
              type="text"
              class="settings-input"
              .value=${String(this.pageConfig?.url || "")}
              @change=${(event) =>
                this.updateCollectionItemBaseField("url", event.target.value)}
            />
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-header">
            <h3>Metadata fields</h3>
          </div>
          ${metadataFields.length === 0
            ? html`<p class="settings-empty">No metadata fields available.</p>`
            : html`${metadataFields.map(
                (field) => html`
                  <div class="field-row field-row-compact">
                    <label class="settings-label">${field.path}</label>
                    <input
                      type="text"
                      class="settings-input"
                      .value=${Array.isArray(field.value)
                        ? field.value.join(", ")
                        : String(field.value ?? "")}
                      @change=${(event) =>
                        this.updateCollectionItemMetadataField(
                          field.path,
                          event.target.value,
                          field.type,
                        )}
                    />
                  </div>
                `,
              )}`}
        </div>
      </div>
    `;
  }

  renderViewContent(content) {
    if (this.activeView === "preview") {
      return html`<div class="view-placeholder">Preview section</div>`;
    }

    if (this.activeView === "settings") {
      if (this.currentSelection?.type === "collection-config") {
        return this.renderCollectionConfigSettings();
      }
      if (this.currentSelection?.type === "collection") {
        return this.renderCollectionItemSettings();
      }
      return html`<div class="view-placeholder">Settings section</div>`;
    }

    return content.map((node) =>
      renderNode(node, this.pageConfig, this.onPageConfigUpdated, renderNode),
    );
  }

  render() {
    if (!this.pageConfig) {
      return html``;
    }

    const content = Array.isArray(this.pageConfig?.content)
      ? this.pageConfig.content
      : [];

    return html`<div class="editor">
      <div class="editor-top-menu">
        <div class="left-menu">
          <div class="page-info">
            <div class="page-info-main">
              <span class="page-title"
                >${this.pageConfig?.title ||
                this.pageConfig?.id ||
                "Untitled"}</span
              >
            </div>
            <span class="page-path"
              >${this.pageConfig?.url ||
              (this.currentSelection?.type === "collection"
                ? `/collections/${this.currentSelection.collectionId}/${this.currentSelection.itemId}`
                : this.currentSelection?.type === "collection-config"
                  ? `/collections/${this.currentSelection.collectionId}/_config.json`
                  : this.currentSelection?.type === "shared"
                    ? `/shared/${this.currentSelection.componentId}`
                    : `/${this.currentSelection?.pageId || "index"}`)}</span
            >
          </div>
          <div class="view-mode-switcher">
            <editor-radio-button
              .options=${this.viewOptions}
              .value=${this.activeView}
              @change=${this.onActiveViewChange}
              disabledTooltip=${true}
            ></editor-radio-button>
          </div>
        </div>
        <div class="right-menu">
          <div class="size-switcher">
            <editor-radio-button
              .options=${this.sizeOptions}
              .value=${this.activeSize}
              @change=${this.onActiveSizeChange}
              disabledTooltip=${true}
            ></editor-radio-button>
          </div>
          <editor-btn @click=${this.onPublishClick}>Publish</editor-btn>
          ${this.publishStatus
            ? html`<span
                style="margin-left: 10px; font-size: 12px; opacity: 0.8;"
                >${this.publishStatus}</span
              >`
            : null}
        </div>
      </div>
      <div class="website website-container">
        ${this.activeSize !== "desktop"
          ? html`<div class="orientation-switcher">
              <editor-radio-button
                .options=${this.orientationOptions}
                .value=${this.activeOrientation}
                @change=${this.onActiveOrientationChange}
                disabledTooltip=${true}
              ></editor-radio-button>
            </div>`
          : ""}
        <div
          class="website-viewport size-${this.activeSize} orientation-${this
            .activeOrientation}"
        >
          ${this.renderViewContent(content)}
        </div>
      </div>
    </div>`;
  }
}

customElements.define("website-editor", WebsiteEditor);
