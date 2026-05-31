import { html as litHtml } from "lit";
import { OwbEmbed } from "./embed.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}

export async function publishRenderEmbed(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { html: node?.html ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-embed .html=${payload.html} .settings=${payload.settings} data-props=${JSON.stringify({ html: payload.html, settings: payload.settings })}></owb-embed>`,
  );
}
