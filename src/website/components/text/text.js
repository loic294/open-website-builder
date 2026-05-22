import { LitElement, html, css, unsafeCSS } from "lit";
import { Editor, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListPlus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  TypeOutline,
  Underline as UnderlineIcon,
  Undo2,
  createElement,
} from "lucide/dist/cjs/lucide";

import styles from "./styles.css?inline";

export const defaultTextConfig = {
  type: "text",
  content: "<p>This is a default text</p>",
};

const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

class Text extends LitElement {
  static properties = {
    content: { type: String },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  static styles = unsafeCSS(styles);

  constructor() {
    super();
    this.content = "";
    this.node = null;
    this.pageConfig = null;
    this.editor = null;
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.dispatchEvent(
      new CustomEvent("page-config-updated", {
        detail: nextPageConfig,
        bubbles: true,
        composed: true,
      }),
    );
  }

  updateNodeContent(nodes, targetNodeId, nextContent) {
    return nodes.map((currentNode) => {
      if (currentNode?.id === targetNodeId && currentNode?.type === "text") {
        return {
          ...currentNode,
          content: nextContent,
        };
      }

      if (Array.isArray(currentNode?.content)) {
        return {
          ...currentNode,
          content: this.updateNodeContent(
            currentNode.content,
            targetNodeId,
            nextContent,
          ),
        };
      }

      return currentNode;
    });
  }

  firstUpdated() {
    const menuEl = this.renderRoot.querySelector(".menu");
    this.editor = new Editor({
      element: this.renderRoot.querySelector("[data-editor]"),
      injectCSS: true,
      extensions: [
        StarterKit,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        TextStyle,
        FontSize,
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
      onSelectionUpdate: () => {
        this.requestUpdate();
      },
      onBlur: ({ editor }) => {
        const nextContent = editor.getHTML();
        this.content = nextContent;

        if (!this.pageConfig || !this.node?.id) {
          return;
        }

        const nextPageConfig = {
          ...this.pageConfig,
          content: this.updateNodeContent(
            Array.isArray(this.pageConfig.content)
              ? this.pageConfig.content
              : [],
            this.node.id,
            nextContent,
          ),
        };

        this.dispatchPageConfigUpdated(nextPageConfig);
      },
    });
  }

  toggleLink() {
    if (!this.editor) {
      return;
    }

    if (this.editor.isActive("link")) {
      this.editor.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = this.editor.getAttributes("link").href || "https://";
    const url = window.prompt("Enter URL", previousUrl);

    if (!url) {
      return;
    }

    this.editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  toggleTextStyle() {
    if (!this.editor) {
      return;
    }

    if (this.editor.isActive("textStyle")) {
      this.editor.chain().focus().unsetMark("textStyle").run();
      return;
    }

    this.editor
      .chain()
      .focus()
      .setMark("textStyle", { color: "inherit" })
      .run();
  }

  setFontSize(event) {
    if (!this.editor) {
      return;
    }

    const nextSize = event.target.value;
    if (!nextSize) {
      this.editor.chain().focus().unsetFontSize().run();
      return;
    }

    this.editor.chain().focus().setFontSize(nextSize).run();
  }

  getCurrentFontSize() {
    if (!this.editor) {
      return "";
    }

    return this.editor.getAttributes("textStyle")?.fontSize || "";
  }

  setHeadingStyle(event) {
    if (!this.editor) {
      return;
    }

    const nextHeading = event.target.value;

    if (nextHeading === "paragraph") {
      this.editor.chain().focus().setParagraph().run();
      return;
    }

    const level = Number.parseInt(nextHeading, 10);
    if (!Number.isNaN(level) && level >= 1 && level <= 6) {
      this.editor.chain().focus().setHeading({ level }).run();
    }
  }

  getCurrentHeadingStyle() {
    if (!this.editor) {
      return "paragraph";
    }

    for (let level = 1; level <= 6; level += 1) {
      if (this.editor.isActive("heading", { level })) {
        return String(level);
      }
    }

    return "paragraph";
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
        <editor-btn
          style="light icon"
          title="Bold"
          @click="${() => this.editor.commands.toggleBold()}"
        >
          ${createElement(Bold)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Italic"
          @click="${() => this.editor.commands.toggleItalic()}"
        >
          ${createElement(Italic)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Underline"
          @click="${() => this.editor.commands.toggleUnderline()}"
        >
          ${createElement(UnderlineIcon)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Link"
          @click="${() => this.toggleLink()}"
        >
          ${createElement(Link2)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Text style"
          @click="${() => this.toggleTextStyle()}"
        >
          ${createElement(TypeOutline)}
        </editor-btn>
        <select
          class="toolbar-select"
          @change="${(event) => this.setFontSize(event)}"
          .value="${this.getCurrentFontSize()}"
        >
          <option value="">Font size</option>
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="32px">32</option>
        </select>
        <select
          class="toolbar-select heading-style-select"
          @change="${(event) => this.setHeadingStyle(event)}"
          .value="${this.getCurrentHeadingStyle()}"
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
          <option value="5">H5</option>
          <option value="6">H6</option>
        </select>
        <editor-btn
          style="light icon"
          title="Strike"
          @click="${() => this.editor.chain().focus().toggleStrike().run()}"
        >
          ${createElement(Strikethrough)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Bullet list"
          @click="${() => this.editor.chain().focus().toggleBulletList().run()}"
        >
          ${createElement(List)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Blockquote"
          @click="${() => this.editor.chain().focus().toggleBlockquote().run()}"
        >
          ${createElement(Quote)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Code block"
          @click="${() => this.editor.chain().focus().toggleCodeBlock().run()}"
        >
          ${createElement(Code2)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Heading"
          @click="${() =>
            this.editor.chain().focus().toggleHeading({ level: 2 }).run()}"
        >
          ${createElement(Heading2)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="List item"
          @click="${() =>
            this.editor.chain().focus().splitListItem("listItem").run()}"
        >
          ${createElement(ListPlus)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Ordered list"
          @click="${() =>
            this.editor.chain().focus().toggleOrderedList().run()}"
        >
          ${createElement(ListOrdered)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Paragraph"
          @click="${() => this.editor.chain().focus().setParagraph().run()}"
        >
          ${createElement(Pilcrow)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Align left"
          @click="${() =>
            this.editor.chain().focus().setTextAlign("left").run()}"
        >
          ${createElement(AlignLeft)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Align center"
          @click="${() =>
            this.editor.chain().focus().setTextAlign("center").run()}"
        >
          ${createElement(AlignCenter)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Align right"
          @click="${() =>
            this.editor.chain().focus().setTextAlign("right").run()}"
        >
          ${createElement(AlignRight)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Justify"
          @click="${() =>
            this.editor.chain().focus().setTextAlign("justify").run()}"
        >
          ${createElement(AlignJustify)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Undo"
          @click="${() => this.editor.chain().focus().undo().run()}"
        >
          ${createElement(Undo2)}
        </editor-btn>
        <editor-btn
          style="light icon"
          title="Redo"
          @click="${() => this.editor.chain().focus().redo().run()}"
        >
          ${createElement(Redo2)}
        </editor-btn>
      </div>
    </div>`;
  }
}

export const editorRenderText = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
) => {
  return html`<site-text
    .node=${node}
    .pageConfig=${pageConfig}
    .content=${String(node.content ?? "")}
    @page-config-updated=${onPageConfigUpdated}
  ></site-text>`;
};

customElements.define("site-text", Text);
