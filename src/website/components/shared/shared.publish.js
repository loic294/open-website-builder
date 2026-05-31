export async function publishRenderShared(node, context) {
  const componentId = String(node?.settings?.shared_component_id || "").trim();
  if (!componentId) {
    context.warnings.push("Shared component is missing shared_component_id");
    return "";
  }

  if (context.sharedStack.has(componentId)) {
    context.warnings.push(
      `Detected circular shared component reference: ${componentId}`,
    );
    return "";
  }

  const componentConfig = await context.loadSharedComponent(componentId);
  if (!componentConfig) {
    context.warnings.push(`Shared component not found: ${componentId}`);
    return "";
  }

  context.sharedStack.add(componentId);
  const rendered = await context.renderNodes(componentConfig.content, context);
  context.sharedStack.delete(componentId);
  return rendered;
}
