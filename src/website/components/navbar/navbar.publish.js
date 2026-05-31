import { html as litHtml } from "lit";
import { OwbNavbar } from "./navbar.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
}

export async function publishRenderNavbar(node, context) {
  const tokenValues = context?.tokenValues || {};
  const currentPath = context?.pageUrl || "";
  const payload = applyTokensToJson(
    { links: node?.links ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-navbar .links=${payload.links} .settings=${payload.settings} .currentPath=${currentPath} data-props=${JSON.stringify({ links: payload.links, settings: payload.settings, currentPath })}></owb-navbar>`,
  );
}
