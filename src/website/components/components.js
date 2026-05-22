import { editorRenderSiteSection } from "./site-section/site-section";
import { editorRenderShared } from "./shared/shared";
import { editorRenderText } from "./text/text";
import { editorRenderImage } from "./image/image";

const renderComponents = new Map();
renderComponents.set("section", editorRenderSiteSection);
renderComponents.set("shared", editorRenderShared);
renderComponents.set("text", editorRenderText);
renderComponents.set("image", editorRenderImage);

export { renderComponents };
