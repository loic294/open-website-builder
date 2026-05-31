import { html as litHtml } from "lit";
import { OwbSection } from "./section.js";
import {
  insertChildrenBefore,
  renderChildrenWithGrid,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}

export async function publishRenderSection(node, context) {
  const settings = node?.settings ?? {};
  const childrenHtml = await renderChildrenWithGrid(node, context);
  const sectionHtml = await ssrRenderToString(
    litHtml`<owb-section .settings=${settings} data-props=${JSON.stringify({ settings })}></owb-section>`,
  );
  return insertChildrenBefore(sectionHtml, "</owb-section>", childrenHtml);
}
