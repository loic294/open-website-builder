import { html } from "lit";
import { renderComponents } from "../../website/components/components";

export function renderNode(node, pageConfig, onPageConfigUpdated, renderNode) {
  if (!node || typeof node !== "object") {
    return html``;
  }

  const renderFunction = renderComponents.get(node.type);
  if (renderFunction) {
    return renderFunction(node, pageConfig, onPageConfigUpdated, renderNode);
  }

  return html`No content to display`;
}
