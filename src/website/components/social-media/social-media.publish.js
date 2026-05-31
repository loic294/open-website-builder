import { html as litHtml } from "lit";
import { OwbSocialMedia } from "./social-media.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-social-media")) {
  customElements.define("owb-social-media", OwbSocialMedia);
}

export async function publishRenderSocialMedia(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { items: node?.items ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-social-media .items=${payload.items} .settings=${payload.settings} data-props=${JSON.stringify({ items: payload.items, settings: payload.settings })}></owb-social-media>`,
  );
}
