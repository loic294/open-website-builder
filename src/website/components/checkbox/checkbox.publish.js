import { configScript } from "../../../../server/publish/publish-utils.js";

export function publishRenderCheckbox(node) {
  const s = node?.settings ?? {};
  return `<owb-checkbox>${configScript({
    checkboxLabel: s.settingCheckboxLabel ?? s.checkboxLabel ?? "",
    checkboxName: s.settingCheckboxName ?? s.checkboxName ?? "",
    checkboxValue: s.settingCheckboxValue ?? s.checkboxValue ?? "",
    checkboxDefaultChecked:
      s.settingCheckboxDefaultChecked ?? s.checkboxDefaultChecked ?? false,
    checkboxRequired: s.settingCheckboxRequired ?? s.checkboxRequired ?? false,
  })}</owb-checkbox>`;
}
