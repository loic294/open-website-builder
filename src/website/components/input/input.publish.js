import { configScript } from "../../../../server/publish/publish-utils.js";

export function publishRenderInput(node) {
  const s = node?.settings ?? {};
  return `<owb-input>${configScript({
    fieldType: s.settingFieldType ?? s.fieldType ?? "text",
    label: s.settingLabel ?? s.label ?? "",
    name: s.settingName ?? s.name ?? "",
    required: s.settingRequired ?? s.required ?? false,
    placeholder: s.settingPlaceholder ?? s.placeholder ?? "",
    min: s.settingMin ?? s.min ?? "",
    max: s.settingMax ?? s.max ?? "",
    step: s.settingStep ?? s.step ?? "",
    rows: s.settingRows ?? s.rows ?? "4",
    minLength: s.settingMinLength ?? s.minLength ?? "",
    maxLength: s.settingMaxLength ?? s.maxLength ?? "",
    pattern: s.settingPattern ?? s.pattern ?? "",
    customCss: s.settingCustomCss ?? s.customCss ?? "",
  })}</owb-input>`;
}
