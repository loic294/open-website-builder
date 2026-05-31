import { html as litHtml } from "lit";
import { OwbImage } from "./image.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}

export async function publishRenderImage(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { url: node?.url ?? "", settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-image
      .url=${payload.url}
      .settings=${payload.settings}
      data-props=${JSON.stringify({ url: payload.url, settings: payload.settings })}
    ></owb-image>`,
  );
}
