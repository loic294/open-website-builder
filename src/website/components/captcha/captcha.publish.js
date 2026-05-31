import { configScript } from "../../../../server/publish/publish-utils.js";

export function publishRenderCaptcha(node) {
  const s = node?.settings ?? {};
  return `<owb-captcha>${configScript({
    captchaChallengeUrl:
      s.settingCaptchaChallengeUrl ?? s.captchaChallengeUrl ?? "",
  })}</owb-captcha>`;
}
