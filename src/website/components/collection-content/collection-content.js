import { html, LitElement } from "lit";

export class OwbCollectionContent extends LitElement {
  static editorPlugin = null;

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    isSettingsOpen: { state: true },
  };

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    this.isSettingsOpen = false;
    this._onActiveOwnerChanged = this._onActiveOwnerChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    if (OwbCollectionContent.editorPlugin) {
      window.addEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCollectionContent.editorPlugin.onConnected?.(this);
    }
  }

  disconnectedCallback() {
    if (OwbCollectionContent.editorPlugin) {
      window.removeEventListener(
        "owb-active-settings-owner-changed",
        this._onActiveOwnerChanged,
      );
      OwbCollectionContent.editorPlugin.onDisconnected?.(this);
    }
    super.disconnectedCallback();
  }

  _onActiveOwnerChanged(event) {
    const ownerNodeId = String(event?.detail?.ownerNodeId || "");
    this.isSettingsOpen = Boolean(
      ownerNodeId && ownerNodeId === String(this.node?.id || ""),
    );
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    OwbCollectionContent.editorPlugin?.onUpdated?.(this, changedProperties);
  }

  render() {
    const isEditorMode = OwbCollectionContent.editorPlugin !== null;
    return html`
      <link rel="stylesheet" href="/owb-styles/collection-content.css" />
      <div
        class="collection-content-placeholder${isEditorMode &&
        this.isSettingsOpen
          ? " is-settings-open"
          : ""}"
        data-editor-block=${isEditorMode ? "" : null}
        @pointerdown=${isEditorMode
          ? () => OwbCollectionContent.editorPlugin?.onPointerDown?.(this)
          : null}
      >
        Collection content
      </div>
    `;
  }
}

if (!customElements.get("owb-collection-content")) {
  customElements.define("owb-collection-content", OwbCollectionContent);
}
