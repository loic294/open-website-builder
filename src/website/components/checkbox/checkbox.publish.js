import { html as litHtml } from "lit";
import { OwbCheckbox } from "./checkbox.js";
import {
  applyTokensToJson,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}

export async function publishRenderCheckbox(node, context) {
  const tokenValues = context?.tokenValues || {};
  const s = applyTokensToJson(node?.settings ?? {}, tokenValues);
  return await ssrRenderToString(
    litHtml`<owb-checkbox
      .settingCheckboxLabel=${String(s.settingCheckboxLabel ?? s.checkboxLabel ?? "")}
      .settingCheckboxName=${String(s.settingCheckboxName ?? s.checkboxName ?? "")}
      .settingCheckboxValue=${String(s.settingCheckboxValue ?? s.checkboxValue ?? "")}
      .settingCheckboxDefaultChecked=${Boolean(s.settingCheckboxDefaultChecked ?? s.checkboxDefaultChecked ?? false)}
      .settingCheckboxRequired=${Boolean(s.settingCheckboxRequired ?? s.checkboxRequired ?? false)}
      data-props=${JSON.stringify({ settings: s })}
    ></owb-checkbox>`,
  );
}
