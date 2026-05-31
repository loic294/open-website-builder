export async function publishRenderCollectionContent(node, context) {
  const items = Array.isArray(context?.collectionItemContent)
    ? context.collectionItemContent
    : [];

  if (items.length === 0) {
    return `<owb-collection-content></owb-collection-content>`;
  }

  return await context.renderNodes(items, context);
}
