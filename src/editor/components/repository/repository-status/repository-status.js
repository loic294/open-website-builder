import { LitElement, html, unsafeCSS } from "lit";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  GitBranch,
  RefreshCw,
  createElement,
} from "lucide";

import { repositoryStatusController } from "../../../data/repository-status-controller.js";
import { browserPopover } from "../../ui/browser-popover/browser-popover.js";
import "../../ui/button/button.js";
import styles from "./styles.css?inline";

function statusLabel(status) {
  if (!status) return "Checking repository";
  if (status.syncState === "diverged") {
    return `${status.ahead} ahead, ${status.behind} behind`;
  }
  if (status.behind)
    return `${status.behind} update${status.behind === 1 ? "" : "s"} available`;
  if (status.ahead)
    return `${status.ahead} commit${status.ahead === 1 ? "" : "s"} to push`;
  if (status.dirty)
    return `${status.changedFiles} local change${status.changedFiles === 1 ? "" : "s"}`;
  if (status.syncState === "no-upstream") return "No upstream configured";
  return "Up to date";
}

function errorOutput(error) {
  return [
    error?.command ? `$ ${error.command}` : "",
    error?.stdout || "",
    error?.stderr || "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export class RepositoryStatus extends LitElement {
  static properties = {
    variant: { type: String, reflect: true },
    snapshot: { state: true },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.variant = "card";
    this.snapshot = repositoryStatusController.snapshot();
    this.unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = repositoryStatusController.subscribe((snapshot) => {
      this.snapshot = snapshot;
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    super.disconnectedCallback();
  }

  async runAction(action) {
    try {
      if (action === "refresh") {
        await repositoryStatusController.refresh();
      } else if (action === "pull") {
        await repositoryStatusController.pull();
      } else {
        await repositoryStatusController.push();
      }
    } catch (error) {
      await browserPopover.output(errorOutput(error), {
        title: error?.message || "Git command failed",
      });
    }
  }

  async showCurrentError() {
    const error = this.snapshot?.error;
    if (!error) return;
    await browserPopover.output(errorOutput(error), {
      title: error.message || "Git status failed",
    });
  }

  renderActions(status, action) {
    const busy = Boolean(action);
    return html`
      <button
        class="icon-action"
        type="button"
        title="Refresh repository status"
        ?disabled=${busy || this.snapshot.loading}
        @click=${() => this.runAction("refresh")}
      >
        ${createElement(RefreshCw)}
      </button>
      <editor-btn
        style="light"
        ?compact=${this.variant === "card"}
        ?disabled=${busy || !status?.upstream}
        ?loading=${action === "pull"}
        @click=${() => this.runAction("pull")}
        >${createElement(ArrowDownToLine)} Pull</editor-btn
      >
      ${this.variant === "card"
        ? html`<editor-btn
          compact
            ?disabled=${busy || !status?.upstream}
            ?loading=${action === "push"}
            @click=${() => this.runAction("push")}
            >${createElement(ArrowUpFromLine)} Commit &amp; Push</editor-btn
          >`
        : null}
    `;
  }

  render() {
    const { status, loading, action, error } = this.snapshot || {};
    if (status?.available === false) return html``;
    if (this.variant === "notice" && !error && !(status?.behind > 0)) {
      return html``;
    }

    return html`<section class="repository-status ${this.variant}">
      <div class="status-heading">
        <span class="status-icon">${createElement(GitBranch)}</span>
        <div class="status-copy">
          <strong
            >${error ? "Repository check failed" : statusLabel(status)}</strong
          >
          <span
            >${status?.branch || (loading ? "Checking..." : "Repository")}</span
          >
        </div>
      </div>
      ${error
        ? html`<button
            class="error-output"
            type="button"
            @click=${this.showCurrentError}
          >
            Show Git output
          </button>`
        : null}
      <div class="status-actions">${this.renderActions(status, action)}</div>
    </section>`;
  }
}

customElements.define("repository-status", RepositoryStatus);
