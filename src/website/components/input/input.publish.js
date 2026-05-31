import {
  escapeAttr,
  escapeHtml,
} from "../../../../server/publish/publish-utils.js";

function attr(name, value) {
  const v = String(value ?? "").trim();
  return v ? ` ${name}="${escapeAttr(v)}"` : "";
}

function boolAttr(name, value) {
  const truthy = value === true || String(value || "") === "true";
  return truthy ? ` ${name}` : "";
}

export function publishRenderInput(node) {
  const s = node?.settings ?? {};
  const fieldType = String(s.settingFieldType ?? s.fieldType ?? "text");
  const label = String(s.settingLabel ?? s.label ?? "");
  const name = String(s.settingName ?? s.name ?? "").trim();
  const required = s.settingRequired ?? s.required ?? false;
  const placeholder = String(
    s.settingPlaceholder ?? s.placeholder ?? "",
  ).trim();
  const min = String(s.settingMin ?? s.min ?? "").trim();
  const max = String(s.settingMax ?? s.max ?? "").trim();
  const step = String(s.settingStep ?? s.step ?? "").trim();
  const rowsRaw = Number.parseInt(s.settingRows ?? s.rows ?? "4", 10);
  const rows = Number.isNaN(rowsRaw) || rowsRaw < 1 ? 4 : rowsRaw;
  const minLength = String(s.settingMinLength ?? s.minLength ?? "").trim();
  const maxLength = String(s.settingMaxLength ?? s.maxLength ?? "").trim();
  const pattern = String(s.settingPattern ?? s.pattern ?? "").trim();
  const isRequired = required === true || String(required || "") === "true";

  const labelHtml = label
    ? `<label class="form-input-label">${escapeHtml(
        isRequired ? `${label} *` : label,
      )}</label>`
    : "";

  let controlHtml;
  if (fieldType === "textarea") {
    controlHtml =
      `<textarea class="form-input-textarea" rows="${rows}"` +
      attr("name", name) +
      attr("placeholder", placeholder) +
      attr("minlength", minLength) +
      attr("maxlength", maxLength) +
      boolAttr("required", required) +
      `></textarea>`;
  } else {
    const inputType = fieldType === "number" ? "number" : "text";
    controlHtml =
      `<input class="form-input-field" type="${inputType}"` +
      attr("name", name) +
      attr("placeholder", placeholder) +
      attr("min", min) +
      attr("max", max) +
      attr("step", step) +
      attr("minlength", minLength) +
      attr("maxlength", maxLength) +
      attr("pattern", pattern) +
      boolAttr("required", required) +
      ` />`;
  }

  return `<owb-input><div class="form-input-block">${labelHtml}${controlHtml}</div></owb-input>`;
}
