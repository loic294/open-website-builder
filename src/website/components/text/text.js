import { LitElement, html, css, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
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
  RotateCcw,
  Strikethrough,
  TypeOutline,
  Underline as UnderlineIcon,
  Undo2,
  createElement,
} from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { withVariantConfig } from "../variant-component-base.js";

import styles from "./styles.css?inline";

export const defaultTextConfig = {
  type: "text",
  content: "<p>This is a default text</p>",
};

const GRID_DEFAULT_ROW_SIZE = 30;

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

function normalizeTextLinksToSameTab(rawHtml) {
  const html = String(rawHtml ?? "");
  const template = document.createElement("template");
  template.innerHTML = html;

  const anchors = template.content.querySelectorAll("a");
  anchors.forEach((anchor) => {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  });

  return template.innerHTML;
}

class Text extends withVariantConfig(EditorComponent) {
  static properties = {
    content: { type: String },
    node: { type: Object },
    pageConfig: { type: Object },
  };

  static styles = [super.styles, unsafeCSS(styles)];

  constructor() {
    super();
    this.content = "";
    this.node = null;
    this.pageConfig = null;
    this.editor = null;
    this.autoGrowFrame = null;
    this.lastSelectionRange = null;
  }

  captureSelectionRange() {
    if (!this.editor) {
      this.lastSelectionRange = null;
      return;
    }

    const selection = this.editor.state?.selection;
    if (!selection) {
      this.lastSelectionRange = null;
      return;
    }

    this.lastSelectionRange = {
      from: selection.from,
      to: selection.to,
    };
  }

  runEditorCommand(buildChain) {
    if (!this.editor || typeof buildChain !== "function") {
      return;
    }

    let chain = this.editor.chain().focus();

    if (
      this.lastSelectionRange &&
      Number.isFinite(this.lastSelectionRange.from) &&
      Number.isFinite(this.lastSelectionRange.to)
    ) {
      chain = chain.setTextSelection(this.lastSelectionRange);
    }

    buildChain(chain).run();
    this.captureSelectionRange();
    this.requestUpdate();
  }

  requestAutoGrowGridRowSpan() {
    if (this.autoGrowFrame) {
      return;
    }

    this.autoGrowFrame = requestAnimationFrame(() => {
      this.autoGrowFrame = null;
      this.autoGrowGridRowSpanForText();
    });
  }

  autoGrowGridRowSpanForText() {
    const editorBlockEl = this.renderRoot?.querySelector("[data-editor-block]");
    if (!(editorBlockEl instanceof HTMLElement)) {
      return;
    }

    const gridContainerEl = this.closest(".container.is-grid-child-editing");
    if (!(gridContainerEl instanceof HTMLElement)) {
      return;
    }

    const currentHeight = editorBlockEl.clientHeight;
    const contentHeight = editorBlockEl.scrollHeight;
    if (!currentHeight || contentHeight <= currentHeight + 1) {
      return;
    }

    const containerStyles = getComputedStyle(gridContainerEl);
    const rowSize =
      Number.parseFloat(
        containerStyles.getPropertyValue("--section-grid-row-size"),
      ) || GRID_DEFAULT_ROW_SIZE;
    const rowGap = Number.parseFloat(containerStyles.rowGap) || 0;
    const gridStep = rowSize + rowGap;
    if (gridStep <= 0) {
      return;
    }

    const settings =
      this.node && typeof this.node.settings === "object" && this.node.settings
        ? this.node.settings
        : {};
    const currentRowSpan = Math.max(
      1,
      Number.parseInt(settings.gridRowSpan, 10) || 1,
    );
    const rowStart = Math.max(
      1,
      Number.parseInt(settings.gridRowStart, 10) || 1,
    );
    const requiredRowSpan = Math.max(
      1,
      Math.ceil((contentHeight + rowGap) / gridStep),
    );

    const configuredRows = Number.parseInt(
      containerStyles.getPropertyValue("--section-grid-rows"),
      10,
    );
    const maxAvailableSpan = Number.isNaN(configuredRows)
      ? requiredRowSpan
      : Math.max(1, configuredRows - rowStart + 1);
    const nextRowSpan = Math.min(requiredRowSpan, maxAvailableSpan);

    if (nextRowSpan <= currentRowSpan) {
      return;
    }

    this.updateSettingsState({
      gridRowSpan: nextRowSpan,
    });
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

  commitEditorContent(nextContent) {
    this.content = nextContent;

    if (!this.pageConfig || !this.node?.id) {
      return;
    }

    if (this.node?.content === nextContent) {
      return;
    }

    const nextPageConfig = {
      ...this.pageConfig,
      content: this.updateNodeContent(
        Array.isArray(this.pageConfig.content) ? this.pageConfig.content : [],
        this.node.id,
        nextContent,
      ),
    };

    this.dispatchPageConfigUpdated(nextPageConfig);
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
        this.captureSelectionRange();
        this.openTextSettingsIfNeeded();
        this.requestUpdate();
      },
      onFocus: () => {
        this.captureSelectionRange();
        this.openTextSettingsIfNeeded();
      },
      onUpdate: ({ editor }) => {
        const nextContent = editor.getHTML();
        this.commitEditorContent(nextContent);
        this.requestAutoGrowGridRowSpan();
      },
      onBlur: ({ editor }) => {
        const nextContent = editor.getHTML();
        this.commitEditorContent(nextContent);
        this.captureSelectionRange();
      },
    });
  }

  toggleLink() {
    if (!this.editor) {
      return;
    }

    if (this.editor.isActive("link")) {
      this.runEditorCommand((chain) => chain.unsetLink());
      return;
    }

    const previousUrl = this.editor.getAttributes("link").href || "https://";
    const url = window.prompt("Enter URL", previousUrl);

    if (!url) {
      return;
    }

    this.runEditorCommand((chain) =>
      chain.extendMarkRange("link").setLink({ href: url }),
    );
  }

  toggleTextStyle() {
    if (!this.editor) {
      return;
    }

    if (this.editor.isActive("textStyle")) {
      this.runEditorCommand((chain) => chain.unsetMark("textStyle"));
      return;
    }

    this.runEditorCommand((chain) =>
      chain.setMark("textStyle", { color: "inherit" }),
    );
  }

  onFocusNodeRequest(event) {
    const requestedNodeId = String(event?.detail?.nodeId || "");
    if (!requestedNodeId || String(this.node?.id || "") !== requestedNodeId) {
      return;
    }

    this.scrollIntoView({ block: "center", behavior: "smooth" });
    this.openTextSettingsIfNeeded();
  }

  openTextSettingsIfNeeded() {
    if (this.isSettingsEditorOpen) {
      return;
    }

    this.openTextSettings();
  }

  renderGlobalTextToolButtons() {
    return html`
      <editor-btn
        style="light icon"
        title="Bold"
        @click=${() => this.runEditorCommand((chain) => chain.toggleBold())}
      >
        ${createElement(Bold)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Italic"
        @click=${() => this.runEditorCommand((chain) => chain.toggleItalic())}
      >
        ${createElement(Italic)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Underline"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleUnderline())}
      >
        ${createElement(UnderlineIcon)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Link"
        @click=${() => this.toggleLink()}
      >
        ${createElement(Link2)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Text style"
        @click=${() => this.toggleTextStyle()}
      >
        ${createElement(TypeOutline)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Strike"
        @click=${() => this.runEditorCommand((chain) => chain.toggleStrike())}
      >
        ${createElement(Strikethrough)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Bullet list"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleBulletList())}
      >
        ${createElement(List)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Blockquote"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleBlockquote())}
      >
        ${createElement(Quote)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Code block"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleCodeBlock())}
      >
        ${createElement(Code2)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Heading"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleHeading({ level: 2 }))}
      >
        ${createElement(Heading2)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="List item"
        @click=${() =>
          this.runEditorCommand((chain) => chain.splitListItem("listItem"))}
      >
        ${createElement(ListPlus)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Ordered list"
        @click=${() =>
          this.runEditorCommand((chain) => chain.toggleOrderedList())}
      >
        ${createElement(ListOrdered)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Paragraph"
        @click=${() => this.runEditorCommand((chain) => chain.setParagraph())}
      >
        ${createElement(Pilcrow)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Align left"
        @click=${() =>
          this.runEditorCommand((chain) => chain.setTextAlign("left"))}
      >
        ${createElement(AlignLeft)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Align center"
        @click=${() =>
          this.runEditorCommand((chain) => chain.setTextAlign("center"))}
      >
        ${createElement(AlignCenter)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Align right"
        @click=${() =>
          this.runEditorCommand((chain) => chain.setTextAlign("right"))}
      >
        ${createElement(AlignRight)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Justify"
        @click=${() =>
          this.runEditorCommand((chain) => chain.setTextAlign("justify"))}
      >
        ${createElement(AlignJustify)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Undo"
        @click=${() => this.runEditorCommand((chain) => chain.undo())}
      >
        ${createElement(Undo2)}
      </editor-btn>
      <editor-btn
        style="light icon"
        title="Redo"
        @click=${() => this.runEditorCommand((chain) => chain.redo())}
      >
        ${createElement(Redo2)}
      </editor-btn>
    `;
  }

  openTextSettings() {
    this.openSettingsEditor({
      tabs: [{ id: "format", label: "Format" }],
      content: (tab) => {
        if (tab !== "format") {
          return html``;
        }

        return html`
          <div style="display: grid; gap: 8px; padding: 10px;">
            <settings-section title="Text tools">
              <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${this.renderGlobalTextToolButtons()}
              </div>
            </settings-section>
            <settings-section title="Typography">
              <editor-select
                label="Font size"
                .value=${this.getCurrentFontSize()}
                .options=${[
                  { label: "Default", value: "" },
                  { label: "12", value: "12px" },
                  { label: "14", value: "14px" },
                  { label: "16", value: "16px" },
                  { label: "18", value: "18px" },
                  { label: "20", value: "20px" },
                  { label: "24", value: "24px" },
                  { label: "32", value: "32px" },
                ]}
                @change=${(event) => this.setFontSizeValue(event.detail.value)}
              ></editor-select>
              <editor-select
                label="Heading style"
                .value=${this.getCurrentHeadingStyle()}
                .options=${[
                  { label: "Paragraph", value: "paragraph" },
                  { label: "H1", value: "1" },
                  { label: "H2", value: "2" },
                  { label: "H3", value: "3" },
                  { label: "H4", value: "4" },
                  { label: "H5", value: "5" },
                  { label: "H6", value: "6" },
                ]}
                @change=${(event) =>
                  this.setHeadingStyleValue(event.detail.value)}
              ></editor-select>
            </settings-section>
            <settings-section title="Style reset">
              <editor-btn style="light" @click=${() => this.resetTextStyle()}
                >${createElement(RotateCcw)} Reset style</editor-btn
              >
            </settings-section>
          </div>
        `;
      },
    });
  }

  setFontSizeValue(nextSize) {
    if (!this.editor) {
      return;
    }

    if (!nextSize) {
      this.runEditorCommand((chain) => chain.unsetFontSize());
      return;
    }

    this.runEditorCommand((chain) => chain.setFontSize(nextSize));
  }

  setFontSize(event) {
    this.setFontSizeValue(event.target.value);
  }

  getCurrentFontSize() {
    if (!this.editor) {
      return "";
    }

    return this.editor.getAttributes("textStyle")?.fontSize || "";
  }

  setHeadingStyleValue(nextHeading) {
    if (!this.editor) {
      return;
    }

    if (nextHeading === "paragraph") {
      this.runEditorCommand((chain) => chain.setParagraph());
      return;
    }

    const level = Number.parseInt(nextHeading, 10);
    if (!Number.isNaN(level) && level >= 1 && level <= 6) {
      this.runEditorCommand((chain) => chain.setHeading({ level }));
    }
  }

  setHeadingStyle(event) {
    this.setHeadingStyleValue(event.target.value);
  }

  resetTextStyle() {
    if (!this.editor) {
      return;
    }

    this.runEditorCommand((chain) =>
      chain.unsetAllMarks().clearNodes().unsetFontSize().setTextAlign("left"),
    );
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
    if (this.autoGrowFrame) {
      cancelAnimationFrame(this.autoGrowFrame);
      this.autoGrowFrame = null;
    }
    this.editor?.destroy();
    this.editor = null;
    super.disconnectedCallback();
  }

  render() {
    return html`<div class="text-block">
      <div data-editor data-editor-block></div>
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
  renderOptions = {},
) => {
  return html`<site-text
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .content=${String(node.content ?? "")}
    @page-config-updated=${onPageConfigUpdated}
  ></site-text>`;
};

class OwbText extends withVariantConfig(LitElement) {
  static styles = [
    unsafeCSS(styles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  render() {
    const { content = "", settings = {} } = this.config;
    const customCss = String(settings?.customCss || "").trim();
    const normalizedContent = normalizeTextLinksToSameTab(content);

    return html`
      ${customCss
        ? html`<style>
            ${customCss}
          </style>`
        : null}
      <div class="text-block ProseMirror">${unsafeHTML(normalizedContent)}</div>
    `;
  }
}

if (!customElements.get("site-text")) {
  customElements.define("site-text", Text);
}

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}
