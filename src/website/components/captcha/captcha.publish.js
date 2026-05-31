import { escapeAttr } from "../../../../server/publish/publish-utils.js";

const ALTCHA_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/gh/altcha-org/altcha/dist/altcha.min.js";

export function publishRenderCaptcha(node) {
  const s = node?.settings ?? {};
  const challengeUrl = String(
    s.settingCaptchaChallengeUrl ?? s.captchaChallengeUrl ?? "",
  ).trim();

  if (!challengeUrl) {
    return `<owb-captcha></owb-captcha>`;
  }

  return (
    `<owb-captcha>` +
    `<altcha-widget challengeurl="${escapeAttr(challengeUrl)}"></altcha-widget>` +
    `<script type="module" async defer src="${ALTCHA_SCRIPT_SRC}" data-altcha-script></script>` +
    `</owb-captcha>`
  );
}
