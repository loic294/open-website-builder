import { html as litHtml } from "lit";
import { OwbYoutube } from "./youtube.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-youtube")) {
  customElements.define("owb-youtube", OwbYoutube);
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

export async function publishRenderYoutube(node, context) {
  const tokenValues = context?.tokenValues || {};
  const s = applyTokensToJson(node?.settings ?? {}, tokenValues);
  return await ssrRenderToString(
    litHtml`<owb-youtube
      .settingVideoId=${String(s.settingVideoId ?? "")}
      .settingListId=${String(s.settingListId ?? "")}
      .settingListType=${String(s.settingListType ?? "")}
      .settingAspectRatio=${String(s.settingAspectRatio ?? "16:9")}
      .settingAutoplay=${toBool(s.settingAutoplay ?? false)}
      .settingControls=${toBool(s.settingControls ?? true)}
      .settingLoop=${toBool(s.settingLoop ?? false)}
      .settingStart=${String(s.settingStart ?? "")}
      .settingEnd=${String(s.settingEnd ?? "")}
      .settingPlaysinline=${toBool(s.settingPlaysinline ?? false)}
      .settingColor=${String(s.settingColor ?? "red")}
      .settingFs=${toBool(s.settingFs ?? true)}
      .settingIvLoadPolicy=${toBool(s.settingIvLoadPolicy ?? true)}
      .settingCcLoadPolicy=${toBool(s.settingCcLoadPolicy ?? false)}
      .settingCcLangPref=${String(s.settingCcLangPref ?? "")}
      .settingHl=${String(s.settingHl ?? "")}
      .settingDisablekb=${toBool(s.settingDisablekb ?? false)}
      .settingRel=${toBool(s.settingRel ?? false)}
      .settingEnablejsapi=${toBool(s.settingEnablejsapi ?? false)}
      .settingOrigin=${String(s.settingOrigin ?? "")}
      .settingWidgetReferrer=${String(s.settingWidgetReferrer ?? "")}
      .settings=${s}
      data-props=${JSON.stringify({ settings: s })}
    ></owb-youtube>`,
  );
}
