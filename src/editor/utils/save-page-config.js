export async function savePageConfig(pageConfig) {
  const response = await fetch("/__save-page-config", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pageConfig),
  });

  if (!response.ok) {
    throw new Error(`Failed to save page config: ${response.status}`);
  }
}
