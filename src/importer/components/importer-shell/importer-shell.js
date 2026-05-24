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
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.xmlContent = "";
    this.fileName = "";
    this.isImporting = false;
    this.result = null;
    this.error = "";
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
        },
      });
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Import failed unexpectedly";
    } finally {
      this.isImporting = false;
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
            <strong>Attachments skipped:</strong> ${summary.attachmentsSkipped ||
            0}
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
            <editor-btn
              ?disabled=${this.isImporting}
              @click=${() => this.runImport()}
              >${this.isImporting ? "Importing..." : "Run import"}</editor-btn
            >
          </div>
        </section>

        ${this.error ? html`<p class="error">${this.error}</p>` : null}
        ${this.renderSummary()}
      </section>
    `;
  }
}

customElements.define("importer-shell", ImporterShell);
