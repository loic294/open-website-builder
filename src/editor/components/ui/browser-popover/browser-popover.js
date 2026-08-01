import { LitElement, html, unsafeCSS } from "lit";

import daisyUI from "../../../styles/daisyui.css?inline";
import styles from "./styles.css?inline";

class BrowserPopover extends LitElement {
  static properties = {
    options: { state: true },
  };

  static styles = [unsafeCSS(daisyUI), unsafeCSS(styles)];

  constructor() {
    super();
    this.options = null;
    this.resolveRequest = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.dataset.theme = "mylight";
  }

  async open(options) {
    if (this.resolveRequest) {
      this.finish(this.cancelValue());
    }

    this.options = options;
    const result = new Promise((resolve) => {
      this.resolveRequest = resolve;
    });

    await this.updateComplete;
    const popover = this.renderRoot.querySelector("[popover]");
    popover?.showPopover();
    requestAnimationFrame(() => {
      this.renderRoot.querySelector("input, .modal-box button")?.focus();
    });
    return result;
  }

  cancelValue() {
    return this.options?.type === "confirm" ? false : null;
  }

  finish(value) {
    const resolve = this.resolveRequest;
    this.resolveRequest = null;
    this.renderRoot.querySelector("[popover]")?.hidePopover();
    this.options = null;
    resolve?.(value);
  }

  onToggle(event) {
    if (event.newState === "closed" && this.resolveRequest) {
      this.finish(this.cancelValue());
    }
  }

  render() {
    if (!this.options) {
      return html``;
    }

    const isPrompt = this.options.type === "prompt";
    const isConfirm = this.options.type === "confirm";
    const isOutput = this.options.type === "output";

    return html`
      <div
        class="modal"
        data-theme="mylight"
        popover
        @toggle=${(event) => this.onToggle(event)}
      >
        <div class="modal-box card card-border bg-base-100 text-base-content">
          <h3 class="text-lg font-bold">${this.options.title}</h3>
          ${this.options.message
            ? html`<p class="py-3 text-sm">${this.options.message}</p>`
            : html``}
          ${isOutput
            ? html`<pre class="command-output">${this.options.output}</pre>`
            : html``}
          ${isPrompt
            ? html`
                <form
                  @submit=${(event) => {
                    event.preventDefault();
                    const input =
                      event.currentTarget.elements.namedItem("value");
                    this.finish(input.value);
                  }}
                >
                  <fieldset class="fieldset">
                    <legend class="fieldset-legend">
                      ${this.options.label}
                    </legend>
                    <input
                      class="input w-full"
                      name="value"
                      type=${this.options.inputType || "text"}
                      .value=${String(this.options.defaultValue || "")}
                      required
                    />
                  </fieldset>
                  <div class="modal-action">
                    <button
                      type="button"
                      class="btn btn-ghost"
                      @click=${() => this.finish(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" class="btn">
                      ${this.options.confirmLabel || "Save"}
                    </button>
                  </div>
                </form>
              `
            : html`
                <div class="modal-action">
                  ${isConfirm
                    ? html`
                        <button
                          type="button"
                          class="btn btn-ghost"
                          @click=${() => this.finish(false)}
                        >
                          Cancel
                        </button>
                      `
                    : html``}
                  <button
                    type="button"
                    class=${isConfirm ? "btn btn-error" : "btn"}
                    @click=${() => this.finish(isConfirm ? true : null)}
                  >
                    ${this.options.confirmLabel ||
                    (isConfirm ? "Confirm" : "OK")}
                  </button>
                </div>
              `}
        </div>
        <button
          type="button"
          class="modal-backdrop"
          aria-label="Close"
          @click=${() => this.finish(this.cancelValue())}
        ></button>
      </div>
    `;
  }
}

customElements.define("browser-popover", BrowserPopover);

function getPopover() {
  let popover = document.querySelector("browser-popover");
  if (!popover) {
    popover = document.createElement("browser-popover");
    document.body.appendChild(popover);
  }
  return popover;
}

export const browserPopover = {
  alert(message, options = {}) {
    return getPopover().open({
      type: "alert",
      title: options.title || "Notice",
      message: String(message || ""),
      confirmLabel: options.confirmLabel || "OK",
    });
  },

  confirm(message, options = {}) {
    return getPopover().open({
      type: "confirm",
      title: options.title || "Confirm action",
      message: String(message || ""),
      confirmLabel: options.confirmLabel || "Confirm",
    });
  },

  prompt(label, options = {}) {
    return getPopover().open({
      type: "prompt",
      title: options.title || label,
      label,
      message: options.message || "",
      defaultValue: options.defaultValue || "",
      inputType: options.inputType || "text",
      confirmLabel: options.confirmLabel || "Save",
    });
  },

  output(output, options = {}) {
    return getPopover().open({
      type: "output",
      title: options.title || "Command output",
      output: String(output || "No command output was returned."),
      confirmLabel: options.confirmLabel || "Close",
    });
  },
};
