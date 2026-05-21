import { LitElement, html, css } from "lit";

export class SiteSection extends LitElement {
  static styles = css`
    section {
      position: relative;
      padding: 20px;
    }

    section:hover:before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 4px solid #ffc700;
      z-index: -1;
    }

    .add-section-button {
      position: absolute;
      top: 0%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
      display: none;
    }

    .add-section-button.bottom {
      top: 100%;
    }

    section:hover .add-section-button {
      display: block;
    }
  `;

  addSection() {
    this.dispatchEvent(
      new CustomEvent("add-section", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`<div>
      <section>
        <editor-button
          style="primary"
          class="add-section-button"
          @click=${this.addSection}
        >
          Add section
        </editor-button>
        <slot></slot>
        <editor-button
          style="primary"
          class="add-section-button bottom"
          @click=${this.addSection}
        >
          Add section
        </editor-button>
      </section>
    </div>`;
  }
}
customElements.define("site-section", SiteSection);
