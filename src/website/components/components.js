import { editorRenderSiteSection } from "./site-section/site-section";
import { editorRenderText } from "./text/text";

const renderComponents = new Map();
renderComponents.set("section", editorRenderSiteSection);
renderComponents.set("text", editorRenderText);

export { renderComponents };
