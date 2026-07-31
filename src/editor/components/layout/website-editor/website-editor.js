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
import { FileManager } from "../file-manager/file-manager.js";
import { browserPopover } from "../../ui/browser-popover/browser-popover.js";

import "../../../../website/components/site-section/site-section.js";
import "../../../../website/components/text/text.js";
import "../../../../website/components/image/image.js";
import "../../../../website/components/button/button.js";
import "../../../../website/components/embed/embed.js";
import "../../../../website/components/youtube/youtube.js";
import "../../../../website/components/collapsable/collapsable.js";
import "../../../../website/components/social-media/social-media.js";
import "../../../../website/components/gallery/gallery.js";
import "../../../../website/components/slider/slider.js";
import "../../../../website/components/navbar/navbar.js";
import "../../../../website/components/collection/collection.js";
import "../../../../website/components/collection-content/collection-content.js";

import baseStyle from "../../../../website/styles/base.css?inline";
import styles from "./website-editor-styles.css?inline";
import daisyUI from "../../../styles/daisyui.css?inline";

class WebsiteEditor extends LitElement {
  static properties = {
    pageConfig: { state: true },
    publishStatus: { state: true },
    activeView: { state: true },
    activeSize: { state: true },
    activeOrientation: { state: true },
    currentSelection: { state: true },
    identityDraft: { state: true },
    sharedIdentityDraft: { state: true },
    collectionMetadataFieldOptions: { state: true },
    collectionMetadataFields: { state: true },
  };

  static styles = [
    unsafeCSS(baseStyle),
    unsafeCSS(styles),
    unsafeCSS(daisyUI),
    css``,
  ];

  constructor() {
    super();
    this.pageConfig = null;
    this.didLoadConfig = false;
    this.publishStatus = "";
    this.activeView = "editor";
    this.activeSize = "desktop";
    this.activeOrientation = "vertical";
    this.currentSelection = { type: "page", pageId: "index" };
    this.identityDraft = "index";
    this.collectionMetadataFieldOptions = [];
    this.collectionMetadataFields = {};
    this.sharedIdentityDraft = {
      id: "",
      title: "",
      fileName: "",
    };
  }

  buildCollectionConfigForSave(config = this.pageConfig) {
    const fieldsEntries = Object.entries(config?.fields || {}).reduce(
      (acc, [fieldName, fieldConfig]) => {
        const normalizedName = String(fieldName || "").trim();
        if (!normalizedName) {
          return acc;
        }

        const valueType = ["array", "object"].includes(fieldConfig?.type)
          ? fieldConfig.type
          : "string";
        const isRequired = Boolean(fieldConfig?.required);

        if (valueType === "array") {
          acc[normalizedName] = {
            ...(fieldConfig && typeof fieldConfig === "object"
              ? fieldConfig
              : {}),
            type: "array",
            items: fieldConfig?.items || { type: "string" },
            ...(isRequired ? { required: true } : {}),
          };
          if (!isRequired) {
            delete acc[normalizedName].required;
          }
          return acc;
        }

        if (valueType === "object") {
          acc[normalizedName] = {
            ...(fieldConfig && typeof fieldConfig === "object"
              ? fieldConfig
              : {}),
            type: "object",
            ...(isRequired ? { required: true } : {}),
          };
          if (!isRequired) {
            delete acc[normalizedName].required;
          }
          return acc;
        }

        acc[normalizedName] = {
          ...(fieldConfig && typeof fieldConfig === "object"
            ? fieldConfig
            : {}),
          type: "string",
          ...(isRequired ? { required: true } : {}),
        };
        if (!isRequired) {
          delete acc[normalizedName].required;
        }
        return acc;
      },
      {},
    );

    const allowlist = Array.isArray(config?.collectionMetadataAllowlist)
      ? config.collectionMetadataAllowlist
          .map((fieldName) => String(fieldName || "").trim())
          .filter(Boolean)
      : [];

    const metadataFields = Object.entries(config?.metadataFields || {}).reduce(
      (acc, [fieldName, fieldConfig]) => {
        const normalizedName = this.normalizeMetadataPath(fieldName);
        if (!normalizedName) {
          return acc;
        }

        const type = ["number", "image"].includes(fieldConfig?.type)
          ? fieldConfig.type
          : "string";
        acc[normalizedName] = {
          ...(fieldConfig && typeof fieldConfig === "object"
            ? fieldConfig
            : {}),
          type,
          ...(fieldConfig?.required ? { required: true } : {}),
        };
        if (!fieldConfig?.required) {
          delete acc[normalizedName].required;
        }
        return acc;
      },
      {},
    );

    const { type: _type, url: _url, ...persistedConfig } = config || {};

    const nextConfig = {
      ...persistedConfig,
      id: String(
        config?.id || this.currentSelection?.collectionId || "",
      ).trim(),
      title: String(config?.title || "Collection").trim() || "Collection",
      fields: fieldsEntries,
      metadataFields,
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

  updated(changedProperties) {
    if (changedProperties.has("pageConfig")) {
      window.dispatchEvent(new CustomEvent("owb-page-settings-changed"));
    }
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
    this.collectionMetadataFields = {};
    this.identityDraft =
      selection.type === "collection-config"
        ? selection.collectionId
        : selection.type === "collection"
          ? selection.itemId
          : selection.type === "shared"
            ? selection.componentId
            : selection.pageId;

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
        const [item, collectionConfig] = await Promise.all([
          dataLayer.getCollectionItemContent(
            selection.collectionId,
            selection.itemId,
          ),
          dataLayer.getCollectionConfig(selection.collectionId),
        ]);
        this.collectionMetadataFields =
          collectionConfig?.metadataFields &&
          typeof collectionConfig.metadataFields === "object"
            ? collectionConfig.metadataFields
            : {};

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

        const resolvedId =
          String(componentConfig?.id || selection.componentId || "").trim() ||
          "component";

        this.pageConfig = {
          ...componentConfig,
          type: "shared",
          id: resolvedId,
          title:
            componentConfig?.title ||
            selection.componentId ||
            "Shared component",
          url: `/shared/${resolvedId}`,
          content: Array.isArray(componentConfig?.content)
            ? componentConfig.content
            : [],
        };
        this.sharedIdentityDraft = {
          id: resolvedId,
          title: String(componentConfig?.title || "").trim(),
          fileName:
            String(componentConfig?.__fileName || "").trim() ||
            `${resolvedId}.json`,
        };
        return;
      }

      this.pageConfig = await dataLayer.getPageConfig(selection.pageId);
      this.identityDraft = String(
        this.pageConfig?.id || selection.pageId || "",
      );
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

    console.log("[OWB debug] onPageConfigUpdated received", {
      selectionType: this.currentSelection?.type,
      pageId: this.currentSelection?.pageId,
      contentLength: this.pageConfig?.content?.length,
    });

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
        console.log(
          "[OWB debug] saving page config for pageId:",
          this.currentSelection?.pageId || "index",
        );
        await dataLayer.savePageConfig(
          this.currentSelection?.pageId || "index",
          this.pageConfig,
        );
        console.log("[OWB debug] savePageConfig done");
      }
    } catch (error) {
      console.error("[OWB debug] savePageConfig error:", error);
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
    this._dispatchViewportChange(event.detail.value, this.activeOrientation);
  };

  onActiveOrientationChange = (event) => {
    this.activeOrientation = event.detail.value;
    this._dispatchViewportChange(this.activeSize, event.detail.value);
  };

  notifyDataChanged() {
    window.dispatchEvent(new CustomEvent("editor-data-changed"));
  }

  _dispatchViewportChange(size, orientation) {
    window.__owbViewport = { size, orientation };
    window.dispatchEvent(
      new CustomEvent("owb-viewport-change", { detail: { size, orientation } }),
    );
  }

  navigateToSelection(selection) {
    const params = new URLSearchParams();

    if (selection?.type === "collection") {
      params.set("type", "collection");
      params.set("collectionId", selection.collectionId || "");
      params.set("itemId", selection.itemId || "");
    } else if (selection?.type === "collection-config") {
      params.set("type", "collection-config");
      params.set("collectionId", selection.collectionId || "");
    } else if (selection?.type === "shared") {
      params.set("type", "shared");
      params.set("componentId", selection.componentId || "");
    } else {
      params.set("type", "page");
      params.set("pageId", selection?.pageId || "index");
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new CustomEvent("editor-route-change"));
  }

  async deleteCurrentSelection() {
    const selection = this.currentSelection || {
      type: "page",
      pageId: "index",
    };

    const label =
      selection.type === "collection-config"
        ? `collection "${selection.collectionId || ""}"`
        : selection.type === "collection"
          ? `collection item "${selection.itemId || ""}"`
          : selection.type === "shared"
            ? `shared component "${selection.componentId || ""}"`
            : `page "${selection.pageId || ""}"`;

    const confirmed = await browserPopover.confirm(
      `Delete ${label}? This cannot be undone.`,
      { title: "Delete permanently", confirmLabel: "Delete" },
    );
    if (!confirmed) {
      return;
    }

    try {
      if (selection.type === "collection-config") {
        await dataLayer.deleteCollection(selection.collectionId || "");
      } else if (selection.type === "collection") {
        await dataLayer.deleteCollectionItem(
          selection.collectionId || "",
          selection.itemId || "",
        );
      } else if (selection.type === "shared") {
        await dataLayer.deleteComponentConfig(selection.componentId || "");
      } else {
        await dataLayer.deletePage(selection.pageId || "index");
      }

      this.notifyDataChanged();

      if (selection.type === "collection") {
        this.navigateToSelection({
          type: "collection-config",
          collectionId: selection.collectionId || "",
        });
        return;
      }

      this.navigateToSelection({ type: "page", pageId: "index" });
    } catch (error) {
      console.error(error);
    }
  }

  normalizeKeySegment(value) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  normalizeMetadataPath(value) {
    return String(value || "")
      .split(".")
      .map((segment) => this.normalizeKeySegment(segment))
      .filter(Boolean)
      .join(".");
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

      entries.push({
        path,
        type: typeof nested === "number" ? "number" : "string",
        value: nested,
      });
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

  deleteValueByPath(obj, path) {
    const segments = String(path || "")
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (!segments.length) {
      return;
    }

    const parents = [];
    let current = obj;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!current?.[segment] || typeof current[segment] !== "object") {
        return;
      }
      parents.push([current, segment]);
      current = current[segment];
    }

    delete current[segments[segments.length - 1]];
    for (let index = parents.length - 1; index >= 0; index -= 1) {
      const [parent, segment] = parents[index];
      if (Object.keys(parent[segment] || {}).length > 0) {
        break;
      }
      delete parent[segment];
    }
  }

  coerceMetadataValue(rawValue, fieldType) {
    if (fieldType === "number") {
      if (String(rawValue ?? "").trim() === "") {
        return null;
      }
      const value = Number(rawValue);
      return Number.isFinite(value) ? value : null;
    }
    if (fieldType === "array") {
      return String(rawValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return String(rawValue || "");
  }

  async persistCurrentMetadata(nextMetadata) {
    const previousConfig = this.pageConfig;
    const nextConfig = { ...this.pageConfig, metadata: nextMetadata };
    this.pageConfig = nextConfig;

    try {
      if (this.currentSelection?.type === "collection") {
        await dataLayer.updateCollectionItem(
          this.currentSelection.collectionId,
          this.currentSelection.itemId,
          nextConfig,
        );
      } else if (this.currentSelection?.type === "page") {
        await dataLayer.savePageConfig(
          this.currentSelection?.pageId || "index",
          nextConfig,
        );
      }
    } catch (error) {
      console.error(error);
      this.pageConfig = previousConfig;
      await browserPopover.alert(
        error instanceof Error ? error.message : "Failed to save metadata",
        { title: "Metadata save failed" },
      );
    }
  }

  async addGeneralMetadataField(requestedPath) {
    const path = this.normalizeMetadataPath(requestedPath);
    if (!path) {
      throw new Error("Enter a valid metadata field name.");
    }

    if (
      this.currentSelection?.type === "collection" &&
      Object.prototype.hasOwnProperty.call(
        this.collectionMetadataFields || {},
        path,
      )
    ) {
      throw new Error(`Field is configured as collection metadata: ${path}`);
    }

    const metadata = structuredClone(this.pageConfig?.metadata || {});
    if (this.getValueByPath(metadata, path) !== undefined) {
      throw new Error(`Metadata field already exists: ${path}`);
    }
    this.setValueByPath(metadata, path, "");
    await this.persistCurrentMetadata(metadata);
  }

  async removeGeneralMetadataField(path) {
    if (
      !(await browserPopover.confirm(`Remove metadata field "${path}"?`, {
        title: "Remove metadata field",
        confirmLabel: "Remove",
      }))
    ) {
      return;
    }
    const metadata = structuredClone(this.pageConfig?.metadata || {});
    this.deleteValueByPath(metadata, path);
    await this.persistCurrentMetadata(metadata);
  }

  getCollectionMetadataFieldDefinitions(config = this.pageConfig) {
    return Object.entries(config?.metadataFields || {}).map(
      ([name, fieldConfig]) => ({
        name,
        type: ["number", "image"].includes(fieldConfig?.type)
          ? fieldConfig.type
          : "string",
        required: Boolean(fieldConfig?.required),
      }),
    );
  }

  async addCollectionMetadataField(requestedName) {
    const name = this.normalizeMetadataPath(requestedName);
    const metadataFields = { ...(this.pageConfig?.metadataFields || {}) };
    if (!name || metadataFields[name]) {
      throw new Error(
        name ? `Metadata field already exists: ${name}` : "Invalid field name.",
      );
    }
    await this.applyCollectionConfigUpdate({
      metadataFields: {
        ...metadataFields,
        [name]: { type: "string" },
      },
    });
  }

  renderAddFieldPopover({ id, label, onAdd }) {
    const anchorName = `--${id}-anchor`;

    return html`
      <button
        type="button"
        class="btn btn-sm"
        popovertarget=${id}
        style=${`anchor-name:${anchorName}`}
      >
        Add field
      </button>
      <div
        id=${id}
        class="dropdown dropdown-end metadata-add-popover"
        popover
        style=${`position-anchor:${anchorName}`}
      >
        <form
          class="card card-border card-sm bg-base-100 metadata-add-card"
          @submit=${async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = form.elements.namedItem("fieldName");
            input.setCustomValidity("");

            try {
              await onAdd(input.value);
              form.reset();
              form.closest("[popover]")?.hidePopover();
            } catch (error) {
              input.setCustomValidity(
                error instanceof Error ? error.message : "Unable to add field",
              );
              input.reportValidity();
            }
          }}
        >
          <label class="fieldset">
            <span class="fieldset-legend">${label}</span>
            <input
              type="text"
              name="fieldName"
              class="input input-sm w-full"
              placeholder="fieldName or group.fieldName"
              required
              autofocus
            />
          </label>
          <div class="card-actions justify-end">
            <button type="submit" class="btn btn-sm">Add</button>
          </div>
        </form>
      </div>
    `;
  }

  async updateCollectionMetadataFieldName(previousName, nextName) {
    const name = this.normalizeMetadataPath(nextName);
    const metadataFields = { ...(this.pageConfig?.metadataFields || {}) };
    if (
      !name ||
      name === previousName ||
      !metadataFields[previousName] ||
      metadataFields[name]
    ) {
      return;
    }
    metadataFields[name] = metadataFields[previousName];
    delete metadataFields[previousName];
    const allowlist = Array.isArray(
      this.pageConfig?.collectionMetadataAllowlist,
    )
      ? this.pageConfig.collectionMetadataAllowlist.map((fieldPath) =>
          fieldPath === previousName ? name : fieldPath,
        )
      : [];
    await this.applyCollectionConfigUpdate({
      metadataFields,
      collectionMetadataAllowlist: [...new Set(allowlist)],
    });
  }

  async updateCollectionMetadataField(fieldName, patch) {
    const metadataFields = { ...(this.pageConfig?.metadataFields || {}) };
    if (!metadataFields[fieldName]) {
      return;
    }
    metadataFields[fieldName] = { ...metadataFields[fieldName], ...patch };
    await this.applyCollectionConfigUpdate({ metadataFields });
  }

  async removeCollectionMetadataField(fieldName) {
    if (
      !(await browserPopover.confirm(
        `Remove collection metadata field "${fieldName}"?`,
        { title: "Remove collection field", confirmLabel: "Remove" },
      ))
    ) {
      return;
    }
    const metadataFields = { ...(this.pageConfig?.metadataFields || {}) };
    delete metadataFields[fieldName];
    const collectionMetadataAllowlist = Array.isArray(
      this.pageConfig?.collectionMetadataAllowlist,
    )
      ? this.pageConfig.collectionMetadataAllowlist.filter(
          (fieldPath) => fieldPath !== fieldName,
        )
      : [];
    await this.applyCollectionConfigUpdate({
      metadataFields,
      collectionMetadataAllowlist,
    });
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
      type: ["array", "object"].includes(config?.type) ? config.type : "string",
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
    } else if (type === "object") {
      fields[fieldName] = {
        type: "object",
        ...(fields[fieldName]?.required ? { required: true } : {}),
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

    return this.flattenObjectFields(metadata)
      .filter((entry) => !entry.path.startsWith("seo."))
      .map((entry) => ({
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

    this.setValueByPath(
      nextMetadata,
      path,
      this.coerceMetadataValue(rawValue, fieldType),
    );
    await this.persistCurrentMetadata(nextMetadata);
  }

  getPageMetadataFields() {
    const metadata =
      this.pageConfig?.metadata && typeof this.pageConfig.metadata === "object"
        ? this.pageConfig.metadata
        : {};

    return this.flattenObjectFields(metadata)
      .filter((entry) => !entry.path.startsWith("seo."))
      .map((entry) => ({
        ...entry,
        value: this.getValueByPath(metadata, entry.path),
      }));
  }

  getSeoConfig() {
    const legacySeo =
      this.pageConfig?.metadata?.seo &&
      typeof this.pageConfig.metadata.seo === "object"
        ? this.pageConfig.metadata.seo
        : {};
    const seo =
      this.pageConfig?.seo && typeof this.pageConfig.seo === "object"
        ? this.pageConfig.seo
        : {};

    return {
      title: String(seo.title ?? legacySeo.title ?? ""),
      description: String(seo.description ?? legacySeo.description ?? ""),
      image: String(
        seo.image ?? this.pageConfig?.metadata?.featuredImageUrl ?? "",
      ),
      canonicalUrl: String(seo.canonicalUrl ?? ""),
      noIndex: Boolean(seo.noIndex),
    };
  }

  async updateSeoField(fieldName, value) {
    const selectionType = this.currentSelection?.type;
    if (selectionType !== "page" && selectionType !== "collection") {
      return;
    }

    const metadata =
      this.pageConfig?.metadata && typeof this.pageConfig.metadata === "object"
        ? { ...this.pageConfig.metadata }
        : {};
    delete metadata.seo;

    const nextConfig = {
      ...this.pageConfig,
      metadata,
      seo: {
        ...this.getSeoConfig(),
        [fieldName]: value,
      },
    };
    this.pageConfig = nextConfig;

    try {
      if (selectionType === "collection") {
        await dataLayer.updateCollectionItem(
          this.currentSelection.collectionId,
          this.currentSelection.itemId,
          nextConfig,
        );
      } else {
        await dataLayer.savePageConfig(
          this.currentSelection?.pageId || "index",
          nextConfig,
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  renderSeoSettings() {
    const seo = this.getSeoConfig();

    return html`
      <div class="card card-border card-sm bg-base-100 settings-card">
        <div class="settings-section-header">
          <h3>SEO</h3>
        </div>

        <div class="field-row field-row-compact">
          <label class="settings-label">Search title</label>
          <input
            type="text"
            class="input input-sm w-full"
            .value=${seo.title}
            placeholder=${String(this.pageConfig?.title || "")}
            @change=${(event) =>
              this.updateSeoField("title", event.target.value)}
          />
        </div>

        <div class="field-row field-row-compact">
          <label class="settings-label">Description</label>
          <textarea
            class="textarea textarea-sm w-full"
            rows="3"
            maxlength="320"
            .value=${seo.description}
            @change=${(event) =>
              this.updateSeoField("description", event.target.value)}
          ></textarea>
        </div>

        <div class="field-row field-row-compact">
          <label class="settings-label">Social image</label>
          <div class="image-picker-row">
            <input
              type="text"
              class="input input-sm w-full"
              .value=${seo.image}
              placeholder="/images/example.jpg"
              @change=${(event) =>
                this.updateSeoField("image", event.target.value)}
            />
            <button
              type="button"
              class="btn btn-sm"
              @click=${() =>
                FileManager.open({
                  mode: "single",
                  selected: seo.image ? [seo.image] : [],
                  onSelect: ([path]) =>
                    this.updateSeoField("image", path || ""),
                })}
            >
              Select
            </button>
          </div>
          ${seo.image
            ? html`<img class="seo-image-preview" src=${seo.image} alt="" />`
            : html``}
        </div>

        <div class="field-row field-row-compact">
          <label class="settings-label">Canonical URL</label>
          <input
            type="url"
            class="input input-sm w-full"
            .value=${seo.canonicalUrl}
            placeholder=${String(this.pageConfig?.url || "")}
            @change=${(event) =>
              this.updateSeoField("canonicalUrl", event.target.value)}
          />
        </div>

        <label class="settings-checkbox-label">
          <input
            type="checkbox"
            class="checkbox checkbox-sm"
            .checked=${seo.noIndex}
            @change=${(event) =>
              this.updateSeoField("noIndex", event.target.checked)}
          />
          Hide this page from search engines
        </label>
      </div>
    `;
  }

  renderMetadataInput(field, updateField) {
    const value = field.value ?? "";
    if (field.type === "image") {
      const imagePath = String(value || "");
      return html`
        <div class="metadata-control-stack">
          <div class="image-picker-row">
            <input
              type="text"
              class="input input-sm w-full"
              .value=${imagePath}
              @change=${(event) => updateField(event.target.value)}
            />
            <button
              type="button"
              class="btn btn-sm"
              @click=${() =>
                FileManager.open({
                  mode: "single",
                  selected: imagePath ? [imagePath] : [],
                  onSelect: ([path]) => updateField(path || ""),
                })}
            >
              Select
            </button>
          </div>
          ${imagePath
            ? html`<img
                class="metadata-image-preview"
                src=${imagePath}
                alt=""
              />`
            : html``}
        </div>
      `;
    }

    return html`
      <input
        type=${field.type === "number" ? "number" : "text"}
        class="input input-sm w-full"
        .value=${Array.isArray(value) ? value.join(", ") : String(value ?? "")}
        @change=${(event) => updateField(event.target.value)}
      />
    `;
  }

  renderGeneralMetadataCard(title, fields, updateField) {
    return html`
      <div class="card card-border card-sm bg-base-100 settings-card">
        <div class="settings-section-header">
          <h3>${title}</h3>
          ${this.renderAddFieldPopover({
            id: "add-general-metadata-field",
            label: "Metadata field name",
            onAdd: (name) => this.addGeneralMetadataField(name),
          })}
        </div>
        ${fields.length === 0
          ? html`<p class="settings-empty">No metadata fields available.</p>`
          : fields.map(
              (field) => html`
                <div class="metadata-value-row">
                  <label class="settings-label">${field.path}</label>
                  ${this.renderMetadataInput(field, (value) =>
                    updateField(field.path, value, field.type),
                  )}
                  <button
                    type="button"
                    class="btn btn-error btn-sm btn-outline metadata-remove"
                    title=${`Remove ${field.path}`}
                    @click=${() => this.removeGeneralMetadataField(field.path)}
                  >
                    Remove
                  </button>
                </div>
              `,
            )}
      </div>
    `;
  }

  renderConfiguredCollectionMetadataCard() {
    const definitions = Object.entries(this.collectionMetadataFields || {}).map(
      ([path, fieldConfig]) => ({
        path,
        type: ["number", "image"].includes(fieldConfig?.type)
          ? fieldConfig.type
          : "string",
        required: Boolean(fieldConfig?.required),
        value: this.getValueByPath(this.pageConfig?.metadata || {}, path),
      }),
    );

    return html`
      <div class="card card-border card-sm bg-base-100 settings-card">
        <div class="settings-section-header">
          <h3>Collection metadata</h3>
        </div>
        ${definitions.length === 0
          ? html`<p class="settings-empty">
              No collection metadata fields configured.
            </p>`
          : definitions.map(
              (field) => html`
                <div class="field-row field-row-compact">
                  <label class="settings-label">
                    ${field.path}${field.required ? " *" : ""}
                  </label>
                  ${this.renderMetadataInput(field, (value) =>
                    this.updateCollectionItemMetadataField(
                      field.path,
                      value,
                      field.type,
                    ),
                  )}
                </div>
              `,
            )}
      </div>
    `;
  }

  async updatePageBaseField(fieldName, value) {
    if (this.currentSelection?.type !== "page") {
      return;
    }

    const nextConfig = {
      ...this.pageConfig,
      [fieldName]: value,
    };

    this.pageConfig = nextConfig;

    try {
      await dataLayer.savePageConfig(
        this.currentSelection?.pageId || "index",
        nextConfig,
      );
    } catch (error) {
      console.error(error);
    }
  }

  async updatePageMetadataField(path, rawValue, fieldType) {
    if (this.currentSelection?.type !== "page") {
      return;
    }

    const nextMetadata = {
      ...(this.pageConfig?.metadata &&
      typeof this.pageConfig.metadata === "object"
        ? this.pageConfig.metadata
        : {}),
    };

    this.setValueByPath(
      nextMetadata,
      path,
      this.coerceMetadataValue(rawValue, fieldType),
    );
    await this.persistCurrentMetadata(nextMetadata);
  }

  async saveCurrentIdentity() {
    const selection = this.currentSelection;
    const requestedId = String(this.identityDraft || "").trim();
    if (!selection || !requestedId) {
      return;
    }

    try {
      let result;
      let nextSelection;

      if (selection.type === "collection-config") {
        result = await dataLayer.updateCollectionIdentity(
          selection.collectionId,
          { id: requestedId },
        );
        nextSelection = {
          type: "collection-config",
          collectionId: result.id,
        };
      } else if (selection.type === "collection") {
        result = await dataLayer.updateCollectionItemIdentity(
          selection.collectionId,
          selection.itemId,
          { id: requestedId },
        );
        nextSelection = {
          type: "collection",
          collectionId: selection.collectionId,
          itemId: result.id,
        };
      } else if (selection.type === "page") {
        result = await dataLayer.updatePageIdentity(selection.pageId, {
          id: requestedId,
        });
        nextSelection = { type: "page", pageId: result.id };
      } else {
        return;
      }

      this.identityDraft = result.id;
      this.pageConfig = { ...this.pageConfig, id: result.id };
      this.notifyDataChanged();
      this.navigateToSelection(nextSelection);
    } catch (error) {
      console.error(error);
      await browserPopover.alert(
        error instanceof Error ? error.message : "Failed to update id",
        { title: "ID update failed" },
      );
    }
  }

  renderIdentitySetting() {
    return html`
      <form
        class="field-row identity-setting-row"
        @submit=${(event) => {
          event.preventDefault();
          this.saveCurrentIdentity();
        }}
      >
        <label class="settings-label">Id</label>
        <input
          type="text"
          class="input input-sm w-full"
          .value=${String(this.identityDraft || "")}
          @input=${(event) => {
            this.identityDraft = event.target.value;
          }}
        />
        <button type="submit" class="btn btn-sm">Save</button>
      </form>
    `;
  }

  updateSharedIdentityDraft(fieldName, value) {
    this.sharedIdentityDraft = {
      ...(this.sharedIdentityDraft || {}),
      [fieldName]: String(value || ""),
    };
  }

  async saveSharedIdentity() {
    if (this.currentSelection?.type !== "shared") {
      return;
    }

    const currentComponentId = String(
      this.currentSelection?.componentId || this.pageConfig?.id || "",
    ).trim();

    try {
      const result = await dataLayer.updateComponentIdentity(
        currentComponentId,
        {
          id: String(this.sharedIdentityDraft?.id || "").trim(),
          title: String(this.sharedIdentityDraft?.title || "").trim(),
          fileName: `${String(this.sharedIdentityDraft?.id || "").trim()}.json`,
        },
      );

      const nextComponentId = String(result?.id || currentComponentId).trim();
      const nextTitle =
        String(result?.title || this.sharedIdentityDraft?.title || "").trim() ||
        nextComponentId;
      const nextFileName =
        String(
          result?.fileName || this.sharedIdentityDraft?.fileName || "",
        ).trim() || `${nextComponentId}.json`;

      this.pageConfig = {
        ...this.pageConfig,
        id: nextComponentId,
        title: nextTitle,
        url: `/shared/${nextComponentId}`,
        __fileName: nextFileName,
      };

      this.sharedIdentityDraft = {
        id: nextComponentId,
        title: nextTitle,
        fileName: nextFileName,
      };

      this.notifyDataChanged();

      if (nextComponentId !== currentComponentId) {
        this.navigateToSelection({
          type: "shared",
          componentId: nextComponentId,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  renderPageSettings() {
    const metadataFields = this.getPageMetadataFields();

    return html`
      <div class="settings-stack">
        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Page</h3>
          </div>

          ${this.renderIdentitySetting()}

          <div class="field-row field-row-compact">
            <label class="settings-label">Title</label>
            <input
              type="text"
              class="input input-sm w-full"
              .value=${String(this.pageConfig?.title || "")}
              @change=${(event) =>
                this.updatePageBaseField("title", event.target.value)}
            />
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">URL</label>
            <input
              type="text"
              class="input input-sm w-full"
              .value=${String(this.pageConfig?.url || "")}
              @change=${(event) =>
                this.updatePageBaseField("url", event.target.value)}
            />
          </div>
        </div>

        ${this.renderSeoSettings()}
        ${this.renderGeneralMetadataCard(
          "Metadata fields",
          metadataFields,
          (path, value, type) =>
            this.updatePageMetadataField(path, value, type),
        )}

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Danger zone</h3>
          </div>
          <button
            type="button"
            class="btn btn-error btn-sm"
            @click=${() => this.deleteCurrentSelection()}
          >
            Delete page
          </button>
        </div>
      </div>
    `;
  }

  renderCollectionConfigSettings() {
    const fields = this.getCollectionConfigFields();
    const metadataFields = this.getCollectionMetadataFieldDefinitions();
    const selectedAllowlist = Array.isArray(
      this.pageConfig?.collectionMetadataAllowlist,
    )
      ? this.pageConfig.collectionMetadataAllowlist
      : [];
    const metadataFieldOptions = [
      ...new Set([
        ...Object.keys(this.pageConfig?.metadataFields || {}),
        ...this.collectionMetadataFieldOptions,
      ]),
    ].sort((a, b) => a.localeCompare(b));

    return html`
      <div class="settings-stack">
        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Collection</h3>
          </div>
          ${this.renderIdentitySetting()}
        </div>

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Metadata fields</h3>
            ${this.renderAddFieldPopover({
              id: "add-collection-metadata-field",
              label: "Collection metadata field name",
              onAdd: (name) => this.addCollectionMetadataField(name),
            })}
          </div>

          ${metadataFields.length === 0
            ? html`<p class="settings-empty">
                No collection metadata fields configured.
              </p>`
            : metadataFields.map(
                (field) => html`
                  <div class="field-row metadata-definition-row">
                    <input
                      type="text"
                      class="input input-sm w-full"
                      .value=${field.name}
                      @change=${(event) =>
                        this.updateCollectionMetadataFieldName(
                          field.name,
                          event.target.value,
                        )}
                    />
                    <select
                      class="select select-sm w-full"
                      .value=${field.type}
                      @change=${(event) =>
                        this.updateCollectionMetadataField(field.name, {
                          type: event.target.value,
                        })}
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="image">Image</option>
                    </select>
                    <label class="settings-checkbox-label">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
                        .checked=${field.required}
                        @change=${(event) =>
                          this.updateCollectionMetadataField(field.name, {
                            required: event.target.checked,
                          })}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      class="btn btn-error btn-sm btn-outline"
                      @click=${() =>
                        this.removeCollectionMetadataField(field.name)}
                    >
                      Remove
                    </button>
                  </div>
                `,
              )}
        </div>

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Fields</h3>
            <button
              type="button"
              class="btn btn-sm"
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
                      class="input input-sm w-full"
                      .value=${field.name}
                      @change=${(event) =>
                        this.updateCollectionConfigFieldName(
                          field.name,
                          event.target.value,
                        )}
                    />
                    <select
                      class="select select-sm w-full"
                      .value=${field.type}
                      @change=${(event) =>
                        this.updateCollectionConfigFieldType(
                          field.name,
                          event.target.value,
                        )}
                    >
                      <option value="string">Text</option>
                      <option value="array">Array of text</option>
                      <option value="object">Object</option>
                    </select>
                    <label class="settings-checkbox-label">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm"
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
                      class="btn btn-error btn-sm btn-outline"
                      @click=${() =>
                        this.removeCollectionConfigField(field.name)}
                    >
                      Remove
                    </button>
                  </div>
                `,
              )}
        </div>

        <div class="card card-border card-sm bg-base-100 settings-card">
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
                          class="checkbox checkbox-sm"
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

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Danger zone</h3>
          </div>
          <button
            type="button"
            class="btn btn-error btn-sm"
            @click=${() => this.deleteCurrentSelection()}
          >
            Delete collection
          </button>
        </div>
      </div>
    `;
  }

  renderCollectionItemSettings() {
    const configuredPaths = new Set(
      Object.keys(this.collectionMetadataFields || {}),
    );
    const metadataFields = this.getCollectionItemMetadataFields().filter(
      (field) => !configuredPaths.has(field.path),
    );
    const tagsValue = Array.isArray(this.pageConfig?.tags)
      ? this.pageConfig.tags.join(", ")
      : "";

    return html`
      <div class="settings-stack">
        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Collection item</h3>
          </div>

          ${this.renderIdentitySetting()}

          <div class="field-row field-row-compact">
            <label class="settings-label">Title</label>
            <input
              type="text"
              class="input input-sm w-full"
              .value=${String(this.pageConfig?.title || "")}
              @change=${(event) =>
                this.updateCollectionItemBaseField("title", event.target.value)}
            />
          </div>

          <div class="field-row field-row-compact">
            <label class="settings-label">Excerpt</label>
            <textarea
              class="textarea textarea-sm w-full"
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
              class="input input-sm w-full"
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
              class="input input-sm w-full"
              .value=${String(this.pageConfig?.url || "")}
              @change=${(event) =>
                this.updateCollectionItemBaseField("url", event.target.value)}
            />
          </div>
        </div>

        ${this.renderSeoSettings()}
        ${this.renderConfiguredCollectionMetadataCard()}
        ${this.renderGeneralMetadataCard(
          "Other metadata",
          metadataFields,
          (path, value, type) =>
            this.updateCollectionItemMetadataField(path, value, type),
        )}

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Danger zone</h3>
          </div>
          <button
            type="button"
            class="btn btn-error btn-sm"
            @click=${() => this.deleteCurrentSelection()}
          >
            Delete collection item
          </button>
        </div>
      </div>
    `;
  }

  renderSharedSettings() {
    return html`
      <div class="settings-stack">
        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Shared component</h3>
          </div>

          <form
            class="field-row identity-setting-row"
            @submit=${(event) => {
              event.preventDefault();
              this.saveSharedIdentity();
            }}
          >
            <label class="settings-label">Id</label>
            <input
              type="text"
              class="input input-sm w-full"
              .value=${String(this.sharedIdentityDraft?.id || "")}
              @input=${(event) =>
                this.updateSharedIdentityDraft("id", event.target.value)}
            />
            <button type="submit" class="btn btn-sm">Save</button>
          </form>

          <div class="field-row field-row-compact">
            <label class="settings-label">Title</label>
            <input
              type="text"
              class="input input-sm w-full"
              .value=${String(this.sharedIdentityDraft?.title || "")}
              @input=${(event) =>
                this.updateSharedIdentityDraft("title", event.target.value)}
            />
          </div>
        </div>

        <div class="card card-border card-sm bg-base-100 settings-card">
          <div class="settings-section-header">
            <h3>Danger zone</h3>
          </div>
          <button
            type="button"
            class="btn btn-error btn-sm"
            @click=${() => this.deleteCurrentSelection()}
          >
            Delete shared component
          </button>
        </div>
      </div>
    `;
  }

  renderCurrentSettings() {
    if (this.currentSelection?.type === "collection-config") {
      return this.renderCollectionConfigSettings();
    }
    if (this.currentSelection?.type === "collection") {
      return this.renderCollectionItemSettings();
    }
    if (this.currentSelection?.type === "page") {
      return this.renderPageSettings();
    }
    if (this.currentSelection?.type === "shared") {
      return this.renderSharedSettings();
    }
    return html`<div class="settings-empty">No settings available.</div>`;
  }

  renderViewContent(content) {
    if (this.activeView === "preview") {
      return html`<div class="view-placeholder">
        <iframe
          src="${this.pageConfig?.url || ""}"
          frameborder="0"
          class="website-preview-iframe"
        ></iframe>
      </div>`;
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

    return html`<div class="editor" data-theme="mylight">
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
