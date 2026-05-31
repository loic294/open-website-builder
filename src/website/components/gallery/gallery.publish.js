import { html as litHtml } from "lit";
import { OwbGallery } from "./gallery.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}

export async function publishRenderGallery(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { images: node?.images ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-gallery .images=${payload.images} .settings=${payload.settings} data-props=${JSON.stringify({ images: payload.images, settings: payload.settings })}></owb-gallery>`,
  );
}
