import { publishRenderText } from "../../src/website/components/text/text.publish.js";
import { publishRenderImage } from "../../src/website/components/image/image.publish.js";
import { publishRenderButton } from "../../src/website/components/button/button.publish.js";
import { publishRenderEmbed } from "../../src/website/components/embed/embed.publish.js";
import { publishRenderSocialMedia } from "../../src/website/components/social-media/social-media.publish.js";
import { publishRenderGallery } from "../../src/website/components/gallery/gallery.publish.js";
import { publishRenderSlider } from "../../src/website/components/slider/slider.publish.js";
import { publishRenderNavbar } from "../../src/website/components/navbar/navbar.publish.js";
import { publishRenderShared } from "../../src/website/components/shared/shared.publish.js";
import { publishRenderSection } from "../../src/website/components/site-section/section.publish.js";
import { publishRenderContainer } from "../../src/website/components/container/container.publish.js";
import { publishRenderCollection } from "../../src/website/components/collection/collection.publish.js";
import { publishRenderCollectionContent } from "../../src/website/components/collection-content/collection-content.publish.js";
import { publishRenderForm } from "../../src/website/components/form/form.publish.js";
import { publishRenderInput } from "../../src/website/components/input/input.publish.js";
import { publishRenderCaptcha } from "../../src/website/components/captcha/captcha.publish.js";
import { publishRenderCheckbox } from "../../src/website/components/checkbox/checkbox.publish.js";

export const publishRenderers = new Map([
  ["text", publishRenderText],
  ["image", publishRenderImage],
  ["button", publishRenderButton],
  ["embed", publishRenderEmbed],
  ["social-media", publishRenderSocialMedia],
  ["gallery", publishRenderGallery],
  ["slider", publishRenderSlider],
  ["navbar", publishRenderNavbar],
  ["shared", publishRenderShared],
  ["section", publishRenderSection],
  ["container", publishRenderContainer],
  ["collection", publishRenderCollection],
  ["collection-content", publishRenderCollectionContent],
  ["form", publishRenderForm],
  ["input", publishRenderInput],
  ["captcha", publishRenderCaptcha],
  ["checkbox", publishRenderCheckbox],
]);
