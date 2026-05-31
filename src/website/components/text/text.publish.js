import { html as litHtml } from "lit";
import { OwbText } from "./text.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}

export async function publishRenderText(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { content: node?.content ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-text
      .content=${payload.content}
      .settings=${payload.settings}
      data-props=${JSON.stringify({ content: payload.content, settings: payload.settings })}
    ></owb-text>`,
  );
}
