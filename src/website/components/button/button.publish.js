import { html as litHtml } from "lit";
import { OwbButton } from "./button.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}

export async function publishRenderButton(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { content: node?.content ?? "Button", settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-button
      .content=${payload.content}
      .settings=${payload.settings}
      data-props=${JSON.stringify({ content: payload.content, settings: payload.settings })}
    ></owb-button>`,
  );
}
