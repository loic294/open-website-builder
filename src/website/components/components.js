import { editorRenderSiteSection } from "./site-section/site-section";
import { editorRenderShared } from "./shared/shared";
import { editorRenderText } from "./text/text";

const renderComponents = new Map();
renderComponents.set("section", editorRenderSiteSection);
renderComponents.set("shared", editorRenderShared);
renderComponents.set("text", editorRenderText);

export { renderComponents };
