/**
 * Browser entry point for published sites.
 *
 * Imports all Lit-based owb-* components and registers them.
 *
 * Only import *.js component files here — never *.editor.js sidecars.
 */

// Must be imported first to enable proper DSD hydration (prevents Lit from
// re-rendering over existing SSR shadow DOM content, avoiding duplicate output).
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";

import { OwbButton } from "./website/components/button/button.js";
import { OwbText } from "./website/components/text/text.js";
import { OwbImage } from "./website/components/image/image.js";
import { OwbEmbed } from "./website/components/embed/embed.js";
import { OwbYoutube } from "./website/components/youtube/youtube.js";
import { OwbCollapsable } from "./website/components/collapsable/collapsable.js";
import { OwbGallery } from "./website/components/gallery/gallery.js";
import { OwbSlider } from "./website/components/slider/slider.js";
import { OwbSocialMedia } from "./website/components/social-media/social-media.js";
import { OwbNavbar } from "./website/components/navbar/navbar.js";
import { OwbSection } from "./website/components/site-section/section.js";
import { OwbContainer } from "./website/components/container/container.js";
import { OwbForm } from "./website/components/form/form.js";
import { OwbInput } from "./website/components/input/input.js";
import { OwbCheckbox } from "./website/components/checkbox/checkbox.js";
import { OwbCaptcha } from "./website/components/captcha/captcha.js";

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

if (!customElements.get("owb-youtube")) {
  customElements.define("owb-youtube", OwbYoutube);
}

if (!customElements.get("owb-collapsable")) {
  customElements.define("owb-collapsable", OwbCollapsable);
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

if (!customElements.get("owb-input")) {
  customElements.define("owb-input", OwbInput);
}

if (!customElements.get("owb-checkbox")) {
  customElements.define("owb-checkbox", OwbCheckbox);
}

if (!customElements.get("owb-captcha")) {
  customElements.define("owb-captcha", OwbCaptcha);
}
