import { html as litHtml } from "lit";
import { OwbContainer } from "../container/container.js";
import {
  getSortedCollectionItems,
  getTokenValueMap,
  insertChildrenBefore,
  ssrRenderToString,
} from "../../../../server/publish/publish-utils.js";

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}

export async function publishRenderCollection(node, context) {
  const settings = node?.settings ?? {};
  const collectionId = String(settings.settingCollectionId || "").trim();
  if (!collectionId) {
    context.warnings.push(
      "Collection component is missing settingCollectionId",
    );
    return "";
  }

  const templateNode = Array.isArray(node?.content) ? node.content[0] : null;
  if (!templateNode || typeof templateNode !== "object") {
    context.warnings.push(
      `Collection component \"${collectionId}\" has no first child template`,
    );
    return "";
  }

  if (
    typeof context.loadCollectionItemsMetadata !== "function" ||
    typeof context.loadCollectionConfig !== "function"
  ) {
    context.warnings.push(
      `Collection loaders are missing for component \"${collectionId}\"`,
    );
    return "";
  }

  const metadataResult =
    await context.loadCollectionItemsMetadata(collectionId);
  const collectionConfig = await context.loadCollectionConfig(collectionId);

  const items = Array.isArray(metadataResult?.items)
    ? metadataResult.items
    : [];
  const allowlist = Array.isArray(collectionConfig?.collectionMetadataAllowlist)
    ? collectionConfig.collectionMetadataAllowlist
    : [];

  const sortMode = String(settings.settingCollectionSort || "disk");
  const sortedItems = getSortedCollectionItems(items, sortMode);
  const limitRaw = String(settings.settingCollectionItemsCount || "all").trim();
  const limit =
    limitRaw === "all"
      ? sortedItems.length
      : Math.max(0, Number.parseInt(limitRaw, 10) || 0);

  const selectedItems = sortedItems.slice(0, limit);
  const renderedChildren = [];

  for (const item of selectedItems) {
    const tokenValues = getTokenValueMap(item?.metadata || {}, allowlist);
    const childHtml = await context.renderNode(templateNode, {
      ...context,
      tokenValues,
    });
    if (childHtml) {
      renderedChildren.push(childHtml);
    }
  }

  const childrenHtml = renderedChildren.join("\n");
  const containerHtml = await ssrRenderToString(
    litHtml`<owb-container .settings=${settings} data-props=${JSON.stringify({ settings })}></owb-container>`,
  );
  return insertChildrenBefore(containerHtml, "</owb-container>", childrenHtml);
}
