import { LitElement, html, css } from "lit";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import BubbleMenu from "@tiptap/extension-bubble-menu";

class Text extends LitElement {
  static properties = {
    content: { type: String },
    node: { type: Object },
  };

  static styles = css`
    :host,
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    .menu {
      width: 250px;
      height: 30px;
      background: #ddd;
      border: 1px solid #ccc;
      visibility: hidden;
      position: fixed;
    }
  `;

  constructor() {
    super();
    this.content = "";
    this.node = null;
    this.editor = null;
  }

  firstUpdated() {
    const menuEl = this.renderRoot.querySelector(".menu");
    this.editor = new Editor({
      element: this.renderRoot.querySelector("[data-editor]"),
      extensions: [
        StarterKit,
        BubbleMenu.configure({
          element: menuEl,
          options: {
            strategy: "fixed",
            placement: "top",
          },
          onShow: () => {
            console.log("Bubble menu shown");
          },
          onHide: () => {
            console.log("Bubble menu hidden");
          },
        }),
      ],
      content: this.content,
      onBlur: ({ editor }) => {
        const nextContent = editor.getHTML();
        this.content = nextContent;
        this.dispatchEvent(
          new CustomEvent("content-changed", {
            detail: nextContent,
            bubbles: true,
            composed: true,
          }),
        );
      },
    });
  }

  updated(changedProperties) {
    if (!this.editor) {
      return;
    }

    if (
      changedProperties.has("content") &&
      this.editor.getHTML() !== this.content
    ) {
      this.editor.commands.setContent(this.content || "", false);
    }
  }

  disconnectedCallback() {
    this.editor?.destroy();
    this.editor = null;
    super.disconnectedCallback();
  }

  render() {
    return html`<div>
      <div data-editor></div>
      <div class="menu menu-${this.node.id}">
        <button @click="${() => this.editor.commands.toggleBold()}">
          Bold
        </button>
        <button @click="${() => this.editor.commands.toggleItalic()}">
          Italic
        </button>
        <button @click="${() => this.editor.commands.toggleUnderline()}">
          Underline
        </button>
      </div>
    </div>`;
  }
}
customElements.define("site-text", Text);
