import { editorRenderSiteSection } from "./site-section/site-section";
import { editorRenderShared } from "./shared/shared";
import { editorRenderText } from "./text/text";
import { editorRenderImage } from "./image/image";
import { editorRenderButton } from "./button/button";
import { editorRenderEmbed } from "./embed/embed";
import { editorRenderSocialMedia } from "./social-media/social-media";
import { editorRenderGallery } from "./gallery/gallery";

const renderComponents = new Map();
renderComponents.set("section", editorRenderSiteSection);
renderComponents.set("shared", editorRenderShared);
renderComponents.set("text", editorRenderText);
renderComponents.set("image", editorRenderImage);
renderComponents.set("button", editorRenderButton);
renderComponents.set("embed", editorRenderEmbed);
renderComponents.set("social-media", editorRenderSocialMedia);
renderComponents.set("gallery", editorRenderGallery);

export { renderComponents };
