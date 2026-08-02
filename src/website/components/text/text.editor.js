import { html, render, unsafeCSS } from "lit";
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
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Undo2,
  createElement,
} from "lucide";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { browserPopover } from "../../../editor/components/ui/browser-popover/browser-popover.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbText, defaultTextConfig } from "./text.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultTextConfig };

OwbText.styles = [].concat(OwbText.styles || [], unsafeCSS(blocksStyles));

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

function updateNodeContent(nodes, targetNodeId, nextContent) {
  return nodes.map((node) => {
    if (node.id === targetNodeId) {
      return { ...node, content: nextContent };
    }

    if (Array.isArray(node.content)) {
      return {
        ...node,
        content: updateNodeContent(node.content, targetNodeId, nextContent),
      };
    }

    return node;
  });
}

function runEditorCommand(element, buildChain) {
  const editor = element._tipTapEditor;
  if (!editor) {
    return;
  }

  const selection = element._lastSelectionRange || editor.state.selection;
  buildChain(editor.chain().focus().setTextSelection(selection)).run();
}

function setHeadingStyle(element, nextHeading) {
  const editor = element._tipTapEditor;
  if (!editor) return;

  if (nextHeading === "paragraph") {
    runEditorCommand(element, (chain) => chain.setParagraph());
    return;
  }

  const level = Number.parseInt(nextHeading, 10);
  if (!Number.isNaN(level) && level >= 1 && level <= 6) {
    runEditorCommand(element, (chain) => chain.setHeading({ level }));
  }
}

function getCurrentHeadingStyle(element) {
  const editor = element._tipTapEditor;
  if (!editor) {
    return "paragraph";
  }

  for (let level = 1; level <= 6; level += 1) {
    if (editor.isActive("heading", { level })) {
      return String(level);
    }
  }

  return "paragraph";
}

function setFontSize(element, nextSize) {
  if (!element._tipTapEditor) return;

  if (!nextSize) {
    runEditorCommand(element, (chain) => chain.unsetFontSize());
    return;
  }

  runEditorCommand(element, (chain) => chain.setFontSize(nextSize));
}

function getCurrentFontSize(element) {
  const editor = element._tipTapEditor;
  if (!editor) {
    return "";
  }

  return editor.getAttributes("textStyle")?.fontSize || "";
}

async function toggleLink(element) {
  const editor = element._tipTapEditor;
  if (!editor) {
    return;
  }

  if (editor.isActive("link")) {
    runEditorCommand(element, (chain) => chain.unsetLink());
    return;
  }

  const previousUrl = editor.getAttributes("link").href || "https://";
  const url = await browserPopover.prompt("Link URL", {
    title: "Add link",
    defaultValue: previousUrl,
    inputType: "url",
    confirmLabel: "Add link",
  });

  if (!url) {
    return;
  }

  runEditorCommand(element, (chain) =>
    chain.extendMarkRange("link").setLink({ href: url }),
  );
}

function openTextSettings(element) {
  if (EditorComponent.activeSettingsOwner === element) {
    return;
  }

  EditorComponent.openFor(element, {
    defaultState: {
      fontSize: "",
      headingStyle: "paragraph",
    },
    tabs: [{ id: "format", label: "Format" }],
    content: () => {
      const editor = EditorComponent.instance;
      return html`
        <settings-section title="Text tools">
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            <editor-btn
              style="light icon"
              title="Bold"
              @click=${() =>
                runEditorCommand(element, (chain) => chain.toggleBold())}
            >
              ${createElement(Bold)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Italic"
              @click=${() =>
                runEditorCommand(element, (chain) => chain.toggleItalic())}
            >
              ${createElement(Italic)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Link"
              @click=${() => toggleLink(element)}
            >
              ${createElement(Link2)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Bullet list"
              @click=${() =>
                runEditorCommand(element, (chain) => chain.toggleBulletList())}
            >
              ${createElement(List)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Ordered list"
              @click=${() =>
                runEditorCommand(element, (chain) => chain.toggleOrderedList())}
            >
              ${createElement(ListOrdered)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Paragraph"
              @click=${() =>
                runEditorCommand(element, (chain) => chain.setParagraph())}
            >
              ${createElement(Pilcrow)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Heading"
              @click=${() =>
                runEditorCommand(element, (chain) =>
                  chain.toggleHeading({ level: 2 }),
                )}
            >
              ${createElement(Heading2)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Align left"
              @click=${() =>
                runEditorCommand(element, (chain) =>
                  chain.setTextAlign("left"),
                )}
            >
              ${createElement(AlignLeft)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Align center"
              @click=${() =>
                runEditorCommand(element, (chain) =>
                  chain.setTextAlign("center"),
                )}
            >
              ${createElement(AlignCenter)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Align right"
              @click=${() =>
                runEditorCommand(element, (chain) =>
                  chain.setTextAlign("right"),
                )}
            >
              ${createElement(AlignRight)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Justify"
              @click=${() =>
                runEditorCommand(element, (chain) =>
                  chain.setTextAlign("justify"),
                )}
            >
              ${createElement(AlignJustify)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Undo"
              @click=${() => runEditorCommand(element, (chain) => chain.undo())}
            >
              ${createElement(Undo2)}
            </editor-btn>
            <editor-btn
              style="light icon"
              title="Redo"
              @click=${() => runEditorCommand(element, (chain) => chain.redo())}
            >
              ${createElement(Redo2)}
            </editor-btn>
          </div>
        </settings-section>

        <settings-section
          title="Typography"
          ?overridden=${editor.hasAnyOverriddenKeys("fontSize")}
        >
          <editor-select
            label="Font size"
            .value=${editor.fontSize}
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
            @change=${(event) => {
              editor.updateResponsiveSettingsState({
                fontSize: event.detail.value,
              });
            }}
          ></editor-select>

          <editor-select
            label="Heading style"
            .value=${getCurrentHeadingStyle(element)}
            .options=${[
              { label: "Paragraph", value: "paragraph" },
              { label: "H1", value: "1" },
              { label: "H2", value: "2" },
              { label: "H3", value: "3" },
              { label: "H4", value: "4" },
              { label: "H5", value: "5" },
              { label: "H6", value: "6" },
            ]}
            @change=${(event) => {
              setHeadingStyle(element, event.detail.value);
              editor.updateGlobalSettingsState({
                headingStyle: event.detail.value,
              });
            }}
          ></editor-select>
        </settings-section>
      `;
    },
  });
}

function renderBubbleMenu(menuEl, element) {
  const editor = element._tipTapEditor;
  const isActive = (name, attrs) =>
    editor ? editor.isActive(name, attrs) : false;
  const btn = (label, icon, active, onClick) => html`
    <editor-btn
      style=${`light icon${active ? " active" : ""}`}
      title=${label}
      @mousedown=${(event) => event.preventDefault()}
      @click=${onClick}
    >
      ${createElement(icon)}
    </editor-btn>
  `;
  const currentHeading = getCurrentHeadingStyle(element);
  const currentAlign = ["left", "center", "right", "justify"].find((align) =>
    isActive({ textAlign: align }),
  );
  render(
    html`
      <select
        class="toolbar-select heading-style-select"
        title="Block style"
        .value=${currentHeading}
        @mousedown=${(event) => event.stopPropagation()}
        @change=${(event) => setHeadingStyle(element, event.target.value)}
      >
        <option value="paragraph" ?selected=${currentHeading === "paragraph"}>
          Paragraph
        </option>
        <option value="1" ?selected=${currentHeading === "1"}>H1</option>
        <option value="2" ?selected=${currentHeading === "2"}>H2</option>
        <option value="3" ?selected=${currentHeading === "3"}>H3</option>
        <option value="4" ?selected=${currentHeading === "4"}>H4</option>
        <option value="5" ?selected=${currentHeading === "5"}>H5</option>
        <option value="6" ?selected=${currentHeading === "6"}>H6</option>
      </select>
      ${btn("Bold", Bold, isActive("bold"), () =>
        runEditorCommand(element, (chain) => chain.toggleBold()),
      )}
      ${btn("Italic", Italic, isActive("italic"), () =>
        runEditorCommand(element, (chain) => chain.toggleItalic()),
      )}
      ${btn("Bullet list", List, isActive("bulletList"), () =>
        runEditorCommand(element, (chain) => chain.toggleBulletList()),
      )}
      ${btn("Ordered list", ListOrdered, isActive("orderedList"), () =>
        runEditorCommand(element, (chain) => chain.toggleOrderedList()),
      )}
      ${btn("Link", Link2, isActive("link"), () => toggleLink(element))}
      ${btn("Align left", AlignLeft, currentAlign === "left", () =>
        runEditorCommand(element, (chain) => chain.setTextAlign("left")),
      )}
      ${btn("Align center", AlignCenter, currentAlign === "center", () =>
        runEditorCommand(element, (chain) => chain.setTextAlign("center")),
      )}
      ${btn("Align right", AlignRight, currentAlign === "right", () =>
        runEditorCommand(element, (chain) => chain.setTextAlign("right")),
      )}
      ${btn("Justify", AlignJustify, currentAlign === "justify", () =>
        runEditorCommand(element, (chain) => chain.setTextAlign("justify")),
      )}
    `,
    menuEl,
  );
}

function ensureEditor(element) {
  const editorEl = element.renderRoot?.querySelector(".text-block");
  if (!editorEl || element._tipTapEditor) {
    return;
  }

  const menuEl = document.createElement("div");
  menuEl.className = "menu";
  element.renderRoot.appendChild(menuEl);

  const editor = new Editor({
    element: editorEl,
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
      }),
    ],
    content: String(element.content ?? ""),
    onSelectionUpdate: () => {
      element._lastSelectionRange = editor.state.selection;
      renderBubbleMenu(menuEl, element);
    },
    onTransaction: () => {
      renderBubbleMenu(menuEl, element);
    },
    onFocus: () => {
      element._lastSelectionRange = editor.state.selection;
      openTextSettings(element);
    },
    onUpdate: ({ editor: textEditor }) => {
      const nextContent = textEditor.getHTML();
      if (!element.pageConfig || !element.node?.id) {
        return;
      }

      if (element.node?.content === nextContent) {
        return;
      }

      const nextPageConfig = {
        ...element.pageConfig,
        content: updateNodeContent(
          Array.isArray(element.pageConfig.content)
            ? element.pageConfig.content
            : [],
          element.node.id,
          nextContent,
        ),
      };

      element.dispatchEvent(
        new CustomEvent("page-config-updated", {
          detail: nextPageConfig,
          bubbles: true,
          composed: true,
        }),
      );
    },
  });

  element._tipTapEditor = editor;
  element._bubbleMenuElement = menuEl;
  renderBubbleMenu(menuEl, element);
}

installEditorPlugin(OwbText, {
  onUpdated(element, changedProperties) {
    if (changedProperties.has("node")) {
      element.content = String(element.node?.content ?? "");
      element.settings = element.node?.settings ?? {};

      const editor = element._tipTapEditor;
      if (editor && editor.getHTML() !== element.content) {
        editor.commands.setContent(element.content || "", false);
      }
    }

    ensureEditor(element);
  },

  onConnected(element) {
    element._onFocusNodeRequest = (event) => {
      const requestedNodeId = String(event?.detail?.nodeId || "");
      if (
        !requestedNodeId ||
        String(element.node?.id || "") !== requestedNodeId
      ) {
        return;
      }

      element.scrollIntoView({ block: "center", behavior: "smooth" });
      openTextSettings(element);
      element._tipTapEditor?.commands?.focus?.();
    };

    window.addEventListener("owb-focus-node", element._onFocusNodeRequest);
    element.updateComplete.then(() => ensureEditor(element));
  },

  onDisconnected(element) {
    if (element._onFocusNodeRequest) {
      window.removeEventListener("owb-focus-node", element._onFocusNodeRequest);
      element._onFocusNodeRequest = null;
    }

    if (element._tipTapEditor) {
      element._tipTapEditor.destroy();
      element._tipTapEditor = null;
    }

    if (element._bubbleMenuElement?.parentNode) {
      element._bubbleMenuElement.parentNode.removeChild(
        element._bubbleMenuElement,
      );
      element._bubbleMenuElement = null;
    }
  },

  onPointerDown(element) {
    openTextSettings(element);
  },
});

export const editorRenderText = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-text
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    .content=${String(node.content ?? "")}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-text>`;
};

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}
