import { html as litHtml } from "lit";
import { OwbCollapsable } from "./collapsable.js";
import {
  applyTokensToJson,
  insertChildrenBefore,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-collapsable")) {
  customElements.define("owb-collapsable", OwbCollapsable);
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

export async function publishRenderCollapsable(node, context) {
  const tokenValues = context?.tokenValues || {};
  const s = applyTokensToJson(node?.settings ?? {}, tokenValues);

  const children = Array.isArray(node?.content) ? node.content : [];
  const childContainer = children[0];
  let childHtml = "";
  if (childContainer) {
    childHtml = await context.renderNode(childContainer, context);
  }

  const shellHtml = await ssrRenderToString(
    litHtml`<owb-collapsable
      .settingTitle=${String(s.settingTitle ?? "Section title")}
      .settingIconStyle=${String(s.settingIconStyle ?? "chevron")}
      .settingIconPosition=${String(s.settingIconPosition ?? "right")}
      .settingDefaultOpen=${toBool(s.settingDefaultOpen ?? true)}
      .settingTitleColor=${String(s.settingTitleColor ?? "")}
      .settingTitleBackgroundColor=${String(s.settingTitleBackgroundColor ?? "")}
      .settingTitleBorderColor=${String(s.settingTitleBorderColor ?? "")}
      .settings=${s}
      data-props=${JSON.stringify({ settings: s })}
    ></owb-collapsable>`,
  );

  return insertChildrenBefore(shellHtml, "</owb-collapsable>", childHtml || "");
}
