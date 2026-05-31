import { html as litHtml } from "lit";
import { OwbCaptcha } from "./captcha.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}

export async function publishRenderCaptcha(node, context) {
  const tokenValues = context?.tokenValues || {};
  const s = applyTokensToJson(node?.settings ?? {}, tokenValues);
  return await ssrRenderToString(
    litHtml`<owb-captcha
      .settingCaptchaChallengeUrl=${String(s.settingCaptchaChallengeUrl ?? "")}
      data-props=${JSON.stringify({ settings: s })}
    ></owb-captcha>`,
  );
}
