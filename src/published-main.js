/**
 * Browser entry point for published sites.
 *
 * Imports all Lit-based owb-* components and registers them. Replaces
 * publish-runtime.js as components are progressively migrated to Lit.
 *
 * Only import *.js component files here — never *.editor.js sidecars.
 */

import { OwbButton } from "./website/components/button/button.js";

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}
