import { html as litHtml } from "lit";
import { OwbInput } from "./input.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}

export async function publishRenderInput(node, context) {
  const tokenValues = context?.tokenValues || {};
  const s = applyTokensToJson(node?.settings ?? {}, tokenValues);
  return await ssrRenderToString(
    litHtml`<owb-input
      .settingFieldType=${String(s.settingFieldType ?? s.fieldType ?? "text")}
      .settingLabel=${String(s.settingLabel ?? s.label ?? "")}
      .settingName=${String(s.settingName ?? s.name ?? "")}
      .settingRequired=${Boolean(s.settingRequired ?? s.required ?? false)}
      .settingPlaceholder=${String(s.settingPlaceholder ?? s.placeholder ?? "")}
      .settingMin=${String(s.settingMin ?? s.min ?? "")}
      .settingMax=${String(s.settingMax ?? s.max ?? "")}
      .settingStep=${String(s.settingStep ?? s.step ?? "")}
      .settingRows=${String(s.settingRows ?? s.rows ?? "4")}
      .settingMinLength=${String(s.settingMinLength ?? s.minLength ?? "")}
      .settingMaxLength=${String(s.settingMaxLength ?? s.maxLength ?? "")}
      .settingPattern=${String(s.settingPattern ?? s.pattern ?? "")}
      data-props=${JSON.stringify({ settings: s })}
    ></owb-input>`,
  );
}
