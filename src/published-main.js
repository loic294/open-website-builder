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
import { OwbEmbed } from "./website/components/embed/embed.js";
import { OwbGallery } from "./website/components/gallery/gallery.js";
import { OwbSlider } from "./website/components/slider/slider.js";
import { OwbSocialMedia } from "./website/components/social-media/social-media.js";
import { OwbNavbar } from "./website/components/navbar/navbar.js";
import { OwbSection } from "./website/components/site-section/section.js";
import { OwbContainer } from "./website/components/container/container.js";
import { OwbForm } from "./website/components/form/form.js";

if (!customElements.get("owb-button")) {
  customElements.define("owb-button", OwbButton);
}

if (!customElements.get("owb-text")) {
  customElements.define("owb-text", OwbText);
}

if (!customElements.get("owb-image")) {
  customElements.define("owb-image", OwbImage);
}

if (!customElements.get("owb-embed")) {
  customElements.define("owb-embed", OwbEmbed);
}

if (!customElements.get("owb-gallery")) {
  customElements.define("owb-gallery", OwbGallery);
}

if (!customElements.get("owb-slider")) {
  customElements.define("owb-slider", OwbSlider);
}

if (!customElements.get("owb-social-media")) {
  customElements.define("owb-social-media", OwbSocialMedia);
}

if (!customElements.get("owb-navbar")) {
  customElements.define("owb-navbar", OwbNavbar);
}

if (!customElements.get("owb-section")) {
  customElements.define("owb-section", OwbSection);
}

if (!customElements.get("owb-container")) {
  customElements.define("owb-container", OwbContainer);
}

if (!customElements.get("owb-form")) {
  customElements.define("owb-form", OwbForm);
}
