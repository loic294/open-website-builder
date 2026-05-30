/**
 * @typedef {Object} EditorPlugin
 *
 * An editor plugin adds editor-only behaviour to a base component class.
 * It is installed once on the class (static), not per instance.
 * Component lifecycle methods check for the plugin and delegate to it when present.
 *
 * @property {function(element: LitElement, changedProperties: Map<string, unknown>): void} [onUpdated]
 *   Called from the component's `updated()` lifecycle hook. Typically used to
 *   sync reactive properties from `element.node` when the node reference changes.
 *
 * @property {function(element: LitElement): void} [onPointerDown]
 *   Called when the user clicks/taps the component in the editor. Typically
 *   opens the settings overlay if it is not already open.
 *
 * @property {function(element: LitElement): void} [onConnected]
 *   Called from `connectedCallback`. Use for one-time editor setup.
 *
 * @property {function(element: LitElement): void} [onDisconnected]
 *   Called from `disconnectedCallback`. Use to tear down editor-only listeners.
 */

/**
 * Installs an editor plugin onto a component class.
 * Call this from `COMPONENT.editor.js` before `customElements.define` runs.
 *
 * @param {typeof import('lit').LitElement} ComponentClass
 * @param {EditorPlugin} plugin
 */
export function installEditorPlugin(ComponentClass, plugin) {
  ComponentClass.editorPlugin = plugin;
}
