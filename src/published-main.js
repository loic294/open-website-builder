/**
 * Browser entry point for published sites.
 *
 * Imports all Lit-based owb-* components and registers them. Replaces
 * publish-runtime.js as components are progressively migrated to Lit.
 *
 * Only import *.js component files here — never *.editor.js sidecars.
 */

import { OwbButton } from "./website/components/button/button.js";
import { OwbText } from "./website/components/text/text.js";
import { OwbImage } from "./website/components/image/image.js";

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}
