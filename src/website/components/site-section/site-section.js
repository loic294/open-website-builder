import { OwbSection } from "./section.js";

export const defaultSectionConfig = {
  type: "section",
  content: [],
};

if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}
