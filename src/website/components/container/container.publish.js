import { html as litHtml } from "lit";
import { OwbContainer } from "./container.js";
import {
  insertChildrenBefore,
  renderChildrenWithGrid,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}

export async function publishRenderContainer(node, context) {
  const settings = node?.settings ?? {};
  const childrenHtml = await renderChildrenWithGrid(node, context);
  const containerHtml = await ssrRenderToString(
    litHtml`<owb-container .settings=${settings} data-props=${JSON.stringify({ settings })}></owb-container>`,
  );
  return insertChildrenBefore(containerHtml, "</owb-container>", childrenHtml);
}
