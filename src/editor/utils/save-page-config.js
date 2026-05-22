import { dataLayer } from "../data/data-layer.js";

export async function savePageConfig(pageConfig) {
  await dataLayer.savePageConfig("index", pageConfig);
}
