import { LitElement, html, unsafeCSS } from "lit";
import { dataLayer } from "../../../editor/data/data-layer.js";
import styles from "./styles.css?inline";

class ImporterShell extends LitElement {
  static properties = {
    xmlContent: { state: true },
    fileName: { state: true },
    isImporting: { state: true },
    result: { state: true },
    error: { state: true },
    createCssFiles: { state: true },
    staticSiteDir: { state: true },
    htmlFileContent: { state: true },
    htmlFileName: { state: true },
    isHtmlImporting: { state: true },
    htmlResult: { state: true },
    htmlError: { state: true },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.xmlContent = "";
    this.fileName = "";
    this.isImporting = false;
    this.result = null;
    this.error = "";
    this.createCssFiles = false;
    this.staticSiteDir = "";
    this.htmlFileContent = "";
    this.htmlFileName = "";
    this.isHtmlImporting = false;
    this.htmlResult = null;
    this.htmlError = "";
  }

  onXmlChanged(event) {
    this.xmlContent = event.target.value || "";
  }

  async onFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    this.fileName = file.name || "";
    this.error = "";

    try {
      this.xmlContent = await file.text();
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to read selected file";
    }
  }

  async runImport() {
    const xml = String(this.xmlContent || "").trim();
    if (!xml) {
      this.error = "Provide Squarespace XML content before importing.";
      return;
    }

    this.error = "";
    this.result = null;
    this.isImporting = true;

    try {
      this.result = await dataLayer.importSquarespaceXml({
        xmlContent: xml,
        sourceName: this.fileName || "pasted-xml",
        options: {
          strictAssetDedup: true,
          idConflictPolicy: "suffix",
          createCssFiles: this.createCssFiles,
        },
      });
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Import failed unexpectedly";
    } finally {
      this.isImporting = false;
    }
  }

  async runHtmlImport() {
    const content = String(this.htmlFileContent || "").trim();
    if (!content && !this.staticSiteDir.trim()) {
      this.htmlError = "Select an HTML file or provide a directory path.";
      return;
    }

    this.htmlError = "";
    this.htmlResult = null;
    this.isHtmlImporting = true;

    try {
      this.htmlResult = await dataLayer.importSquarespaceStaticSiteDir(
        content
          ? {
              htmlContent: content,
              fileName: this.htmlFileName,
              options: { idConflictPolicy: "suffix" },
            }
          : {
              staticSiteDir: this.staticSiteDir,
              options: { idConflictPolicy: "suffix" },
            },
      );
    } catch (error) {
      this.htmlError =
        error instanceof Error ? error.message : "Import failed unexpectedly";
    } finally {
      this.isHtmlImporting = false;
    }
  }

  renderSummary() {
    if (!this.result?.summary) {
      return null;
    }

    const summary = this.result.summary;
    return html`
      <section class="result-card">
        <h3>Import Summary</h3>
        <div class="summary-grid">
          <div><strong>Items:</strong> ${summary.totalItems}</div>
          <div><strong>Pages:</strong> ${summary.pagesCreated}</div>
          <div>
            <strong>Collection items:</strong> ${summary.collectionItemsCreated}
          </div>
          <div>
            <strong>Attachments skipped:</strong>
            ${summary.attachmentsSkipped || 0}
          </div>
          <div>
            <strong>Assets downloaded:</strong> ${summary.assetsDownloaded}
          </div>
          <div><strong>Assets skipped:</strong> ${summary.assetsSkipped}</div>
          <div><strong>Assets failed:</strong> ${summary.assetsFailed}</div>
          <div><strong>Warnings:</strong> ${summary.warnings}</div>
          <div><strong>Errors:</strong> ${summary.errors}</div>
        </div>
        ${this.result.reportPath
          ? html`<p class="report-line">
              Report saved at: <span>${this.result.reportPath}</span>
            </p>`
          : null}
      </section>
    `;
  }

  renderHtmlSummary() {
    if (!this.htmlResult?.summary) {
      return null;
    }

    const summary = this.htmlResult.summary;
    return html`
      <section class="result-card">
        <h3>HTML Import Summary</h3>
        <div class="summary-grid">
          <div><strong>Files found:</strong> ${summary.totalFiles}</div>
          <div><strong>Pages created:</strong> ${summary.pagesCreated}</div>
          <div><strong>Pages skipped:</strong> ${summary.pagesSkipped}</div>
          <div>
            <strong>Assets downloaded:</strong> ${summary.assetsDownloaded}
          </div>
          <div><strong>Assets copied:</strong> ${summary.assetsCopied}</div>
          <div><strong>Assets skipped:</strong> ${summary.assetsSkipped}</div>
          <div><strong>Assets failed:</strong> ${summary.assetsFailed}</div>
          <div><strong>Warnings:</strong> ${summary.warnings}</div>
          <div><strong>Errors:</strong> ${summary.errors}</div>
        </div>
        ${this.htmlResult.reportPath
          ? html`<p class="report-line">
              Report saved at: <span>${this.htmlResult.reportPath}</span>
            </p>`
          : null}
      </section>
    `;
  }

  render() {
    return html`
      <section class="importer-shell">
        <header>
          <h1>Squarespace Importer</h1>
          <p>
            Upload a Squarespace WordPress export XML file to create pages,
            collections, metadata, and assets.
          </p>
        </header>

        <section class="panel">
          <label class="label" for="import-file">XML file</label>
          <input
            id="import-file"
            type="file"
            accept=".xml,text/xml"
            @change=${(event) => this.onFileSelected(event)}
          />

          <label class="label" for="xml-input">XML content</label>
          <textarea
            id="xml-input"
            .value=${this.xmlContent}
            placeholder="Paste Squarespace WordPress export XML here"
            @input=${(event) => this.onXmlChanged(event)}
          ></textarea>

          <div class="actions">
            <label class="settings-checkbox-label">
              <input
                type="checkbox"
                .checked=${this.createCssFiles}
                @change=${(e) => {
                  this.createCssFiles = e.target.checked;
                }}
              />
              Create CSS files from inline styles
            </label>
            <editor-btn
              ?disabled=${this.isImporting}
              @click=${() => this.runImport()}
              >${this.isImporting ? "Importing..." : "Run import"}</editor-btn
            >
          </div>
        </section>

        ${this.error ? html`<p class="error">${this.error}</p>` : null}
        ${this.renderSummary()}

        <section class="panel">
          <h2>Static HTML Backup Import</h2>
          <p>
            Upload a Squarespace static HTML page to import it directly, or
            provide a server-side directory path to batch import.
          </p>

          <label class="label" for="html-file-upload">Upload HTML file</label>
          <input
            id="html-file-upload"
            type="file"
            accept=".html,text/html"
            @change=${async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              this.htmlFileName = file.name || "";
              this.htmlError = "";
              try {
                this.htmlFileContent = await file.text();
              } catch (err) {
                this.htmlError =
                  err instanceof Error ? err.message : "Failed to read file";
              }
            }}
          />

          <label class="label" for="static-site-dir"
            >Or: server-side directory path</label
          >
          <input
            id="static-site-dir"
            type="text"
            .value=${this.staticSiteDir}
            placeholder="/path/to/static_site"
            @input=${(e) => {
              this.staticSiteDir = e.target.value || "";
            }}
          />

          <div class="actions">
            <editor-btn
              ?disabled=${this.isHtmlImporting}
              @click=${() => this.runHtmlImport()}
              >${this.isHtmlImporting
                ? "Importing..."
                : "Import static HTML"}</editor-btn
            >
          </div>
        </section>

        ${this.htmlError ? html`<p class="error">${this.htmlError}</p>` : null}
        ${this.renderHtmlSummary()}
      </section>
    `;
  }
}

customElements.define("importer-shell", ImporterShell);
