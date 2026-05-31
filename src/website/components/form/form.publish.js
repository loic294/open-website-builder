import { html as litHtml } from "lit";
import { OwbForm } from "./form.js";
import {
  insertChildrenBefore,
  renderChildrenWithGrid,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}

export async function publishRenderForm(node, context) {
  const settings = node?.settings ?? {};
  const childrenHtml = await renderChildrenWithGrid(node, context);
  const formHtml = await ssrRenderToString(
    litHtml`<owb-form .settings=${settings} data-props=${JSON.stringify({ settings })}></owb-form>`,
  );
  return insertChildrenBefore(formHtml, "</owb-form>", childrenHtml);
}
