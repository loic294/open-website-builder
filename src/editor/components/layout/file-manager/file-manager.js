import { LitElement, html, unsafeCSS } from "lit";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  Grid2x2,
  Image,
  LayoutTemplate,
  Pencil,
  Trash2,
  Upload,
  ZoomIn,
  createElement,
} from "lucide";
import styles from "./styles.css?inline";

const API = {
  async listFolders() {
    const r = await fetch("/__data/files/folders");
    return r.json();
  },
  async createFolder(name) {
    const r = await fetch("/__data/files/folders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return r.json();
  },
  async renameFolder(id, name) {
    const r = await fetch(`/__data/files/folders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return r.json();
  },
  async deleteFolder(id) {
    const r = await fetch(`/__data/files/folders/${encodeURIComponent(id)}`, { method: "DELETE" });
    return r.json();
  },
  async listImages(folderId = null) {
    const url = folderId
      ? `/__data/files/images?folder=${encodeURIComponent(folderId)}`
      : "/__data/files/images";
    const r = await fetch(url);
    return r.json();
  },
  async uploadImage(folderId, file) {
    const form = new FormData();
    form.append("folderId", folderId || "root");
    form.append("file", file, file.name);
    const r = await fetch("/__data/files/upload", { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async renameImage(folderId, oldBasename, newBasename) {
    const r = await fetch("/__data/files/images/rename", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId, oldBasename, newBasename }),
    });
    return r.json();
  },
  async deleteImage(folderId, basename) {
    const r = await fetch("/__data/files/images", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId, basename }),
    });
    return r.json();
  },
  async updateDescription(folderId, basename, description) {
    const r = await fetch("/__data/files/images/description", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folderId, basename, description }),
    });
    return r.json();
  },
};

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export class FileManager extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    _open: { state: true },
    _folders: { state: true },
    _images: { state: true },
    _activeFolderId: { state: true },
    _viewMode: { state: true },
    _focusedImage: { state: true },
    _selectedPaths: { state: true },
    _renamingFolderId: { state: true },
    _renamingFilename: { state: true },
    _uploadProgress: { state: true },
    _confirmAction: { state: true },
    _mode: { state: true },
  };

  // Singleton instance set by editor-main.js
  static instance = null;

  /**
   * Open the file manager.
   * @param {{ mode?: 'single'|'multi', selected?: string[], onSelect?: (paths: string[]) => void }} options
   */
  static open({ mode = "multi", selected = [], onSelect = () => {} } = {}) {
    if (!FileManager.instance) return;
    FileManager.instance._openModal({ mode, selected, onSelect });
  }

  static close() {
    if (!FileManager.instance) return;
    FileManager.instance._closeModal();
  }

  constructor() {
    super();
    this._open = false;
    this._mode = "multi";
    this._folders = [];
    this._images = [];
    this._activeFolderId = null;
    this._viewMode = "grid";
    this._focusedImage = null;
    this._selectedPaths = [];
    this._renamingFolderId = null;
    this._renamingFilename = null;
    this._uploadProgress = null;
    this._confirmAction = null;
    this._onSelect = null;
  }

  async _openModal({ mode, selected, onSelect }) {
    this._mode = mode;
    this._selectedPaths = Array.isArray(selected) ? [...selected] : [];
    this._onSelect = onSelect;
    this._open = true;
    this._viewMode = "grid";
    this._focusedImage = null;
    await this._loadFolders();
    await this._loadImages();
    // Pre-focus an already-selected image in the details panel
    if (this._selectedPaths.length) {
      const match = this._images.find((img) => img.filePath === this._selectedPaths[0]);
      if (match) this._focusedImage = match;
    }
  }

  _closeModal() {
    this._open = false;
    this._confirmAction = null;
  }

  async _loadFolders() {
    try {
      this._folders = await API.listFolders();
    } catch {
      this._folders = [];
    }
  }

  async _loadImages() {
    try {
      this._images = await API.listImages(this._activeFolderId);
    } catch {
      this._images = [];
    }
    // Re-sync focused image from fresh data
    if (this._focusedImage) {
      this._focusedImage =
        this._images.find((img) => img.basename === this._focusedImage.basename && img.folderId === this._focusedImage.folderId) || null;
    }
  }

  async _selectFolder(folderId) {
    this._activeFolderId = folderId;
    this._focusedImage = null;
    await this._loadImages();
  }

  _toggleSelection(img) {
    const path = img.filePath;
    const already = this._selectedPaths.includes(path);
    if (this._mode === "single") {
      this._selectedPaths = already ? [] : [path];
    } else {
      this._selectedPaths = already
        ? this._selectedPaths.filter((p) => p !== path)
        : [...this._selectedPaths, path];
    }
    this._focusedImage = img;
  }

  _confirmSelect() {
    if (this._onSelect) this._onSelect([...this._selectedPaths]);
    this._closeModal();
  }

  // ── Folder management ────────────────────────────────────────────────────────

  async _createFolder() {
    const name = window.prompt("Folder name:");
    if (!name?.trim()) return;
    const folder = await API.createFolder(name.trim());
    this._folders = [...this._folders, folder];
  }

  _startRenameFolder(folderId, e) {
    e.stopPropagation();
    this._renamingFolderId = folderId;
  }

  async _commitRenameFolder(folder, newName) {
    this._renamingFolderId = null;
    if (!newName?.trim() || newName.trim() === folder.name) return;
    await API.renameFolder(folder.id, newName.trim());
    await this._loadFolders();
  }

  _askDeleteFolder(folder) {
    this._confirmAction = {
      message: `Delete folder "${folder.name}" and all its images? This cannot be undone.`,
      onConfirm: async () => {
        this._confirmAction = null;
        await API.deleteFolder(folder.id);
        if (this._activeFolderId === folder.id) this._activeFolderId = null;
        await this._loadFolders();
        await this._loadImages();
      },
    };
  }

  // ── Image management ─────────────────────────────────────────────────────────

  async _handleFileInput(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const folderId = this._activeFolderId || "root";
    this._uploadProgress = `Uploading 0 / ${files.length}…`;
    let uploaded = 0;
    for (const file of files) {
      try {
        await API.uploadImage(folderId, file);
        uploaded++;
        this._uploadProgress = uploaded < files.length
          ? `Uploading ${uploaded} / ${files.length}…`
          : null;
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    this._uploadProgress = null;
    e.target.value = "";
    await this._loadImages();
  }

  _startRenameFile(img, e) {
    e.stopPropagation();
    this._renamingFilename = img.basename;
  }

  async _commitRenameFile(img, newBasename) {
    this._renamingFilename = null;
    if (!newBasename?.trim() || newBasename.trim() === img.basename) return;
    await API.renameImage(img.folderId, img.basename, newBasename.trim());
    await this._loadImages();
  }

  _askDeleteImage(img) {
    this._confirmAction = {
      message: `Delete "${img.basename}"? This cannot be undone.`,
      onConfirm: async () => {
        this._confirmAction = null;
        await API.deleteImage(img.folderId, img.basename);
        if (this._focusedImage?.basename === img.basename) this._focusedImage = null;
        this._selectedPaths = this._selectedPaths.filter((p) => p !== img.filePath);
        await this._loadImages();
      },
    };
  }

  async _saveDescription(img, value) {
    await API.updateDescription(img.folderId, img.basename, value);
    // Update in-memory only, no full reload needed
    this._images = this._images.map((i) =>
      i.basename === img.basename && i.folderId === img.folderId
        ? { ...i, description: value }
        : i,
    );
    if (this._focusedImage?.basename === img.basename) {
      this._focusedImage = { ...this._focusedImage, description: value };
    }
  }

  // ── Lightbox navigation ───────────────────────────────────────────────────────

  _lightboxNav(delta) {
    if (!this._images.length) return;
    const idx = this._focusedImage
      ? this._images.findIndex((i) => i.basename === this._focusedImage.basename && i.folderId === this._focusedImage.folderId)
      : -1;
    const next = (idx + delta + this._images.length) % this._images.length;
    this._focusedImage = this._images[next];
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  render() {
    if (!this._open) return html``;

    return html`
      <div class="overlay" @click=${(e) => { if (e.target === e.currentTarget) this._closeModal(); }}>
        <div class="modal" @click=${(e) => e.stopPropagation()}>
          ${this._renderHeader()}
          <div class="modal-body">
            ${this._renderFoldersPanel()}
            ${this._renderImagesPanel()}
            ${this._renderDetailsPanel()}
          </div>
          ${this._renderFooter()}
        </div>
      </div>
      ${this._confirmAction ? this._renderConfirm() : ""}
    `;
  }

  _renderHeader() {
    return html`
      <div class="modal-header">
        <h2 class="modal-title">File Manager</h2>
        <div class="header-actions">
          ${this._uploadProgress
            ? html`<span class="upload-progress">${this._uploadProgress}</span>`
            : ""}
          <button
            class="btn btn-primary"
            type="button"
            @click=${() => this.renderRoot.querySelector("#upload-input")?.click()}
          >
            ${createElement(Upload)} Upload
          </button>
          <input
            id="upload-input"
            type="file"
            accept="image/*"
            multiple
            style="display:none"
            @change=${this._handleFileInput}
          />
        </div>
      </div>
    `;
  }

  _renderFoldersPanel() {
    const { _folders, _activeFolderId, _renamingFolderId } = this;

    const allItem = html`
      <button
        class="folder-item ${_activeFolderId === null ? "active" : ""}"
        type="button"
        @click=${() => this._selectFolder(null)}
      >
        ${createElement(FolderOpen)}
        <span class="folder-label">All images</span>
      </button>
    `;

    const folderItems = _folders.map(
      (f) => html`
        <div
          class="folder-item ${_activeFolderId === f.id ? "active" : ""}"
          @click=${() => this._selectFolder(f.id)}
        >
          ${createElement(FolderOpen)}
          ${_renamingFolderId === f.id
            ? html`<input
                class="folder-rename-input"
                .value=${f.name}
                autofocus
                @click=${(e) => e.stopPropagation()}
                @keydown=${(e) => {
                  if (e.key === "Enter") this._commitRenameFolder(f, e.target.value);
                  if (e.key === "Escape") { this._renamingFolderId = null; }
                }}
                @blur=${(e) => this._commitRenameFolder(f, e.target.value)}
              />`
            : html`<span class="folder-label">${f.name}</span>`}
          <button
            class="folder-edit-btn"
            type="button"
            title="Rename folder"
            @click=${(e) => this._startRenameFolder(f.id, e)}
          >
            ${createElement(Pencil)}
          </button>
          <button
            class="folder-edit-btn"
            type="button"
            title="Delete folder"
            @click=${(e) => { e.stopPropagation(); this._askDeleteFolder(f); }}
          >
            ${createElement(Trash2)}
          </button>
        </div>
      `,
    );

    return html`
      <aside class="folders-panel">
        <div class="folders-list">
          ${allItem}
          ${folderItems}
        </div>
        <div class="folders-footer">
          <button class="add-folder-btn" type="button" @click=${this._createFolder}>
            ${createElement(FolderPlus)}
            Add new folder
          </button>
        </div>
      </aside>
    `;
  }

  _renderImagesPanel() {
    const { _images, _viewMode, _selectedPaths, _focusedImage } = this;

    const toolbar = html`
      <div class="images-toolbar">
        <span class="images-count">
          ${_images.length} image${_images.length !== 1 ? "s" : ""}
          ${_selectedPaths.length ? ` · ${_selectedPaths.length} selected` : ""}
        </span>
        <div class="view-toggle">
          <button
            class="view-btn ${_viewMode === "grid" ? "active" : ""}"
            type="button"
            title="Grid view"
            @click=${() => { this._viewMode = "grid"; }}
          >
            ${createElement(Grid2x2)}
          </button>
          <button
            class="view-btn ${_viewMode === "lightbox" ? "active" : ""}"
            type="button"
            title="Lightbox view"
            @click=${() => { this._viewMode = "lightbox"; if (!_focusedImage && _images.length) this._focusedImage = _images[0]; }}
          >
            ${createElement(LayoutTemplate)}
          </button>
        </div>
      </div>
    `;

    const body = _viewMode === "grid"
      ? this._renderGridView()
      : this._renderLightboxView();

    return html`
      <section class="images-panel">
        ${toolbar}
        ${body}
      </section>
    `;
  }

  _renderGridView() {
    const { _images, _selectedPaths } = this;

    if (!_images.length) {
      return html`
        <div class="images-grid-scroll">
          <div class="empty-state">
            ${createElement(Image)}
            <span>No images yet.<br>Upload some files to get started.</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="images-grid-scroll">
        <div class="images-grid">
          ${_images.map((img) => {
            const selected = _selectedPaths.includes(img.filePath);
            return html`
              <div
                class="image-tile ${selected ? "selected" : ""}"
                @click=${() => this._toggleSelection(img)}
              >
                <img
                  src=${img.thumbPath || img.filePath}
                  alt=${img.originalFilename || img.basename}
                  loading="lazy"
                />
                <div class="image-tile-overlay">
                  <div class="image-tile-checkbox"></div>
                  <button
                    class="image-tile-zoom"
                    type="button"
                    title="View larger"
                    @click=${(e) => {
                      e.stopPropagation();
                      this._focusedImage = img;
                      this._viewMode = "lightbox";
                    }}
                  >
                    ${createElement(ZoomIn)}
                  </button>
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  _renderLightboxView() {
    const { _images, _focusedImage, _selectedPaths } = this;

    if (!_images.length) {
      return html`
        <div class="lightbox-view">
          <div class="lightbox-main">
            <div class="empty-state" style="color:rgba(255,255,255,0.4)">
              ${createElement(Image)}
              <span>No images yet.</span>
            </div>
          </div>
        </div>
      `;
    }

    const mainImg = _focusedImage || _images[0];

    return html`
      <div class="lightbox-view">
        <div class="lightbox-main">
          <img
            src=${mainImg.smallPath || mainImg.filePath}
            alt=${mainImg.originalFilename || mainImg.basename}
            @click=${() => this._toggleSelection(mainImg)}
          />
          <button class="lightbox-nav prev" type="button" @click=${() => this._lightboxNav(-1)}>
            ${createElement(ChevronLeft)}
          </button>
          <button class="lightbox-nav next" type="button" @click=${() => this._lightboxNav(1)}>
            ${createElement(ChevronRight)}
          </button>
        </div>
        <div class="lightbox-thumbs">
          ${_images.map((img) => {
            const focused = _focusedImage?.basename === img.basename && _focusedImage?.folderId === img.folderId;
            const selected = _selectedPaths.includes(img.filePath);
            return html`
              <div
                class="lightbox-thumb ${focused ? "focused" : ""} ${selected ? "selected" : ""}"
                @click=${() => { this._focusedImage = img; this._toggleSelection(img); }}
              >
                <img src=${img.thumbPath || img.filePath} alt=${img.basename} loading="lazy" />
                <div class="lightbox-thumb-check"></div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  _renderDetailsPanel() {
    const img = this._focusedImage;

    return html`
      <aside class="details-panel">
        <div class="details-scroll">
          ${img
            ? html`
                <img
                  class="details-preview"
                  src=${img.smallPath || img.filePath}
                  alt=${img.originalFilename || img.basename}
                />

                <div class="detail-row">
                  <div class="detail-label">Filename</div>
                  ${this._renamingFilename === img.basename
                    ? html`<div class="detail-filename-row">
                        <input
                          .value=${img.basename}
                          autofocus
                          @keydown=${(e) => {
                            if (e.key === "Enter") this._commitRenameFile(img, e.target.value);
                            if (e.key === "Escape") this._renamingFilename = null;
                          }}
                          @blur=${(e) => this._commitRenameFile(img, e.target.value)}
                        />
                      </div>`
                    : html`<div class="detail-filename-row">
                        <span class="detail-value">${img.basename}</span>
                        <button
                          class="detail-edit-btn"
                          type="button"
                          title="Rename"
                          @click=${(e) => this._startRenameFile(img, e)}
                        >${createElement(Pencil)}</button>
                      </div>`}
                </div>

                <div class="detail-row">
                  <div class="detail-label">Path</div>
                  <div class="detail-value">${img.filePath}</div>
                </div>

                <div class="detail-row">
                  <div class="detail-label">File size</div>
                  <div class="detail-value">${formatBytes(img.fileSize)}</div>
                </div>

                <div class="detail-row">
                  <div class="detail-label">Resolution</div>
                  <div class="detail-value">
                    ${img.width && img.height ? `${img.width} × ${img.height}` : "—"}
                  </div>
                </div>

                <div class="detail-row">
                  <div class="detail-label">Format</div>
                  <div class="detail-value">${img.format || "—"}</div>
                </div>

                <div class="detail-row">
                  <div class="detail-label">Description</div>
                  <textarea
                    class="detail-description"
                    placeholder="Add a description…"
                    .value=${img.description || ""}
                    @blur=${(e) => this._saveDescription(img, e.target.value)}
                  ></textarea>
                </div>

                <button
                  class="detail-delete-btn"
                  type="button"
                  @click=${() => this._askDeleteImage(img)}
                >
                  ${createElement(Trash2)} Delete image
                </button>
              `
            : html`
                <div class="details-preview-empty">
                  ${createElement(Image)}
                </div>
                <p style="font-size:12px;color:var(--editor-muted-text-color,#888);text-align:center;margin:0">
                  Select an image to see its details.
                </p>
              `}
        </div>
      </aside>
    `;
  }

  _renderFooter() {
    const count = this._selectedPaths.length;
    const label = this._mode === "single"
      ? "Select Image"
      : count > 0
        ? `Select ${count} Image${count !== 1 ? "s" : ""}`
        : "Select Images";

    return html`
      <div class="modal-footer">
        <div class="footer-left">
          ${count > 0 ? html`<span>${count} image${count !== 1 ? "s" : ""} selected</span>` : ""}
        </div>
        <div class="footer-right">
          <button class="btn btn-ghost" type="button" @click=${() => this._closeModal()}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="button"
            ?disabled=${count === 0}
            @click=${this._confirmSelect}
          >
            ${label}
          </button>
        </div>
      </div>
    `;
  }

  _renderConfirm() {
    const { message, onConfirm } = this._confirmAction;
    return html`
      <div class="confirm-overlay">
        <div class="confirm-dialog">
          <h3>Are you sure?</h3>
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" type="button" @click=${() => { this._confirmAction = null; }}>
              Cancel
            </button>
            <button class="btn btn-primary" style="background:var(--editor-text-danger,#d73c3c);border-color:var(--editor-text-danger,#d73c3c)" type="button" @click=${onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("file-manager-root", FileManager);
