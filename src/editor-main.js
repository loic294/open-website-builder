import { EditorComponent } from "./editor/components/layout/editor-component/editor-component.js";
import { FileManager } from "./editor/components/layout/file-manager/file-manager.js";
import "./website/components/button/button.editor.js";
import "./website/components/text/text.editor.js";
import "./website/components/image/image.editor.js";
import "./website/components/embed/embed.editor.js";
import "./website/components/youtube/youtube.editor.js";
import "./website/components/collapsable/collapsable.editor.js";
import "./website/components/gallery/gallery.editor.js";
import "./website/components/slider/slider.editor.js";
import "./website/components/social-media/social-media.editor.js";
import "./website/components/navbar/navbar.editor.js";
import "./website/components/container/container.editor.js";
import "./website/components/form/form.editor.js";
import "./editor/components/layout/website-editor/website-editor.js";
import "./editor/components/layout/editor-menu/editor-menu.js";
import "./editor/components/ui/radio-button/radio-button.js";
import "./editor/components/ui/color-dots/color-dots.js";
import "./editor/components/ui/alignment-options/alignment-options.js";
import "./editor/components/ui/text-input/text-input.js";
import "./editor/components/ui/padding-input/padding-input.js";
import "./editor/components/ui/color-picker/color-picker.js";
import "./editor/components/ui/select/select.js";
import "./editor/components/ui/settings-collapsable/settings-collapsable.js";
import "./editor/components/ui/settings-section/settings-section.js";

// Mount the EditorComponent singleton once at body level.
// All plugin-based components call EditorComponent.openFor(element, options)
// instead of extending EditorComponent themselves.
const editorRoot = document.createElement("editor-root");
document.body.appendChild(editorRoot);
EditorComponent.instance = editorRoot;

const fileManagerRoot = document.createElement("file-manager-root");
document.body.appendChild(fileManagerRoot);
FileManager.instance = fileManagerRoot;
