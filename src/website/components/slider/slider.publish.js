import { html as litHtml } from "lit";
import { OwbSlider } from "./slider.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}

export async function publishRenderSlider(node, context) {
  const tokenValues = context?.tokenValues || {};
  const payload = applyTokensToJson(
    { images: node?.images ?? [], settings: node?.settings ?? {} },
    tokenValues,
  );
  return await ssrRenderToString(
    litHtml`<owb-slider .images=${payload.images} .settings=${payload.settings} data-props=${JSON.stringify({ images: payload.images, settings: payload.settings })}></owb-slider>`,
  );
}
