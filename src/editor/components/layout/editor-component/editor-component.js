/**
 * EditorComponent — the singleton `<editor-root>` LitElement. It hosts the
 * shared settings overlay used by plugin-based custom elements (text, image,
 * embed, gallery, slider, button, social-media, navbar, ...) via
 * `EditorComponent.openFor(ownerElement, options)`.
 *
 * No other component extends EditorComponent. The actual settings logic lives
 * in `SettingsController`, which is composed here (and independently in the
 * grid layout editor) so consumers compose, not inherit.
 */

import { LitElement, html, unsafeCSS } from "lit";
import blocksStyles from "./styles-blocks.css?inline";
import {
  SettingsController,
  SETTINGS_HOST_PROPERTIES,
  initSettingsHostState,
  getActiveSettingsOwner,
  setActiveSettingsOwner,
} from "./settings-controller.js";

export class EditorComponent extends LitElement {
  static styles = unsafeCSS(blocksStyles);

  static properties = {
    node: { type: Object },
    pageConfig: { type: Object },
    ...SETTINGS_HOST_PROPERTIES,
  };

  // Singleton instance assigned by editor-main.js once mounted in document.body.
  static instance = null;

  static get activeSettingsOwner() {
    return getActiveSettingsOwner();
  }

  static dispatchActiveSettingsOwnerChanged() {
    setActiveSettingsOwner(getActiveSettingsOwner());
  }

  /**
   * Open the settings overlay for a plugin-based custom element that does NOT
   * extend EditorComponent. The owner must expose `.node` and `.pageConfig`.
   */
  static openFor(ownerElement, options) {
    const instance = EditorComponent.instance;
    if (!instance) return;
    instance.settings.openFor(ownerElement, options);
  }

  constructor() {
    super();
    this.node = null;
    this.pageConfig = null;
    initSettingsHostState(this);
    this.settings = new SettingsController(this, { focusRouter: false });
  }

  connectedCallback() {
    super.connectedCallback();
    this.settings.onConnected();
  }

  willUpdate(changedProperties) {
    this.settings.onWillUpdate(changedProperties);
  }

  disconnectedCallback() {
    this.settings.onDisconnected();
    super.disconnectedCallback();
  }

  // Forwarders so plugin-based callers can do
  //   EditorComponent.instance?.renderSettingsOverlay()
  //   EditorComponent.instance?.closeSettingsEditor()
  // etc.

  renderSettingsOverlay() {
    this.settings.renderSettingsOverlay();
  }

  closeSettingsEditor() {
    this.settings.closeSettingsEditor();
  }

  openSettingsEditor(options) {
    this.settings.openSettingsEditor(options);
  }

  updateSettingsState(nextState) {
    this.settings.updateSettingsState(nextState);
  }

  updateResponsiveSettingsState(nextState) {
    this.settings.updateResponsiveSettingsState(nextState);
  }

  updateGlobalSettingsState(nextState) {
    this.settings.updateGlobalSettingsState(nextState);
  }

  hasAnyOverriddenKeys(...keys) {
    return this.settings.hasAnyOverriddenKeys(...keys);
  }

  renderOverrideIndicator(settingKey) {
    return this.settings.renderOverrideIndicator(settingKey);
  }

  clearSettingOverrides() {
    this.settings.clearSettingOverrides();
  }

  syncSettingsStateFromNode(defaultState) {
    this.settings.syncSettingsStateFromNode(defaultState);
  }

  getNodeCustomCss() {
    return this.settings.getNodeCustomCss();
  }

  dispatchPageConfigUpdated(nextPageConfig) {
    this.settings.dispatchPageConfigUpdated(nextPageConfig);
  }

  get activeViewportBucket() {
    return this.settings.activeViewportBucket;
  }

  render() {
    // The settings overlay is rendered imperatively into document.body by the
    // controller. The singleton element itself has no visible content.
    return html``;
  }
}

if (!customElements.get("editor-root")) {
  customElements.define("editor-root", EditorComponent);
}
