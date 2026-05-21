import { html } from "lit";

import { editorRenderSiteSection } from "../../website/components/site-section/site-section";
import { editorRenderText } from "../../website/components/text/text";

const renderComponents = new Map();
renderComponents.set("section", editorRenderSiteSection);
renderComponents.set("text", editorRenderText);

export function renderNode(node, onAddSection, onContentChanged, renderNode) {
  if (!node || typeof node !== "object") {
    return html``;
  }

  const renderFunction = renderComponents.get(node.type);
  if (renderFunction) {
    return renderFunction(node, onAddSection, onContentChanged, renderNode);
  }

  return html`No content to display`;
}
