import {
  escapeAttr,
  escapeHtml,
} from "../../../../server/publish/publish-utils.js";

const CHECKBOX_STYLES = [
  ".owb-checkbox-block { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-size: 0.95rem; cursor: pointer; }",
  '.owb-checkbox-block input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; cursor: pointer; }',
  ".owb-checkbox-required { color: #b42318; margin-left: 2px; }",
].join(" ");

export function publishRenderCheckbox(node) {
  const s = node?.settings ?? {};
  const label = String(s.settingCheckboxLabel ?? s.checkboxLabel ?? "").trim();
  const name = String(s.settingCheckboxName ?? s.checkboxName ?? "").trim();
  const value = String(s.settingCheckboxValue ?? s.checkboxValue ?? "").trim();
  const defaultChecked =
    (s.settingCheckboxDefaultChecked ?? s.checkboxDefaultChecked) === true ||
    String(
      s.settingCheckboxDefaultChecked ?? s.checkboxDefaultChecked ?? "",
    ) === "true";
  const required =
    (s.settingCheckboxRequired ?? s.checkboxRequired) === true ||
    String(s.settingCheckboxRequired ?? s.checkboxRequired ?? "") === "true";

  const uid = `owb-cb-${Math.random().toString(36).slice(2, 9)}`;

  const stylesTag = `<style data-owb-checkbox-styles>${CHECKBOX_STYLES}</style>`;

  const requiredMark = required
    ? `<span class="owb-checkbox-required">*</span>`
    : "";

  const inputAttrs =
    `type="checkbox" id="${escapeAttr(uid)}"` +
    (name ? ` name="${escapeAttr(name)}"` : "") +
    (value ? ` value="${escapeAttr(value)}"` : "") +
    (defaultChecked ? " checked" : "") +
    (required ? " required" : "");

  return (
    `<owb-checkbox>` +
    stylesTag +
    `<label class="owb-checkbox-block" for="${escapeAttr(uid)}">` +
    `<input ${inputAttrs} />` +
    `<span>${escapeHtml(label)}${requiredMark}</span>` +
    `</label>` +
    `</owb-checkbox>`
  );
}
