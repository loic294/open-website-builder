import { html, unsafeCSS } from "lit";
import { EditorComponent } from "../../../editor/components/layout/editor-component/editor-component.js";
import { installEditorPlugin } from "../../../editor/editor-plugin.js";
import { OwbYoutube, defaultYoutubeConfig } from "./youtube.js";
import blocksStyles from "../../../editor/components/layout/editor-component/styles-blocks.css?inline";

export { defaultYoutubeConfig };

OwbYoutube.styles = [].concat(OwbYoutube.styles || [], unsafeCSS(blocksStyles));

function toBool(value) {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
}

const TEMPLATE_VARIABLE_PATTERN = /^\{\{\s*[a-zA-Z0-9_-]+\s*\}\}$/;

function tryParseYoutubeId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (TEMPLATE_VARIABLE_PATTERN.test(value)) return value;
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{6,})/,
  );
  if (match) return match[1];
  return value.replace(/[^A-Za-z0-9_\-]/g, "");
}

function tryParseYoutubeListId(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (TEMPLATE_VARIABLE_PATTERN.test(value)) return value;
  const match = value.match(/[?&]list=([A-Za-z0-9_\-]+)/);
  if (match) return match[1];
  return value.replace(/[^A-Za-z0-9_\-]/g, "");
}

installEditorPlugin(OwbYoutube, {
  onUpdated(element, changedProperties) {
    if (!changedProperties.has("node")) return;
    const settings = element.node?.settings || {};
    element.settingVideoId = String(settings.settingVideoId ?? "");
    element.settingListId = String(settings.settingListId ?? "");
    element.settingListType = String(settings.settingListType ?? "");
    element.settingAspectRatio = String(settings.settingAspectRatio ?? "16:9");
    element.settingAutoplay = toBool(settings.settingAutoplay ?? false);
    element.settingControls = toBool(settings.settingControls ?? true);
    element.settingLoop = toBool(settings.settingLoop ?? false);
    element.settingStart = String(settings.settingStart ?? "");
    element.settingEnd = String(settings.settingEnd ?? "");
    element.settingPlaysinline = toBool(settings.settingPlaysinline ?? false);
    element.settingColor = String(settings.settingColor ?? "red");
    element.settingFs = toBool(settings.settingFs ?? true);
    element.settingIvLoadPolicy = toBool(settings.settingIvLoadPolicy ?? true);
    element.settingCcLoadPolicy = toBool(settings.settingCcLoadPolicy ?? false);
    element.settingCcLangPref = String(settings.settingCcLangPref ?? "");
    element.settingHl = String(settings.settingHl ?? "");
    element.settingDisablekb = toBool(settings.settingDisablekb ?? false);
    element.settingRel = toBool(settings.settingRel ?? false);
    element.settingEnablejsapi = toBool(settings.settingEnablejsapi ?? false);
    element.settingOrigin = String(settings.settingOrigin ?? "");
    element.settingWidgetReferrer = String(
      settings.settingWidgetReferrer ?? "",
    );
    element.settings = settings;
  },

  onPointerDown(element) {
    if (EditorComponent.activeSettingsOwner === element) return;

    EditorComponent.openFor(element, {
      defaultState: {
        settingVideoId: "",
        settingListId: "",
        settingListType: "",
        settingAspectRatio: "16:9",
        settingAutoplay: false,
        settingControls: true,
        settingLoop: false,
        settingStart: "",
        settingEnd: "",
        settingPlaysinline: false,
        settingColor: "red",
        settingFs: true,
        settingIvLoadPolicy: true,
        settingCcLoadPolicy: false,
        settingCcLangPref: "",
        settingHl: "",
        settingDisablekb: false,
        settingRel: false,
        settingEnablejsapi: false,
        settingOrigin: "",
        settingWidgetReferrer: "",
      },
      tabs: [
        { id: "general", label: "General" },
        { id: "playback", label: "Playback" },
        { id: "player", label: "Player" },
      ],
      content: (activeTab) => {
        const editor = EditorComponent.instance;
        if (activeTab === "playback") return renderPlaybackTab(editor);
        if (activeTab === "player") return renderPlayerTab(editor);
        return renderGeneralTab(editor);
      },
    });
  },

  onConnected(element) {
    element._onFocusNodeRequest = (event) => {
      const requestedNodeId = String(event?.detail?.nodeId || "");
      if (
        !requestedNodeId ||
        String(element.node?.id || "") !== requestedNodeId
      ) {
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      const editorBlock = element.renderRoot?.querySelector(
        "[data-editor-block]",
      );
      if (editorBlock instanceof HTMLElement) {
        editorBlock.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            composed: true,
            cancelable: true,
            pointerId: 1,
            isPrimary: true,
          }),
        );
        return;
      }
      OwbYoutube.editorPlugin?.onPointerDown?.(element);
    };
    window.addEventListener("owb-focus-node", element._onFocusNodeRequest);
  },

  onDisconnected(element) {
    if (element._onFocusNodeRequest) {
      window.removeEventListener("owb-focus-node", element._onFocusNodeRequest);
      element._onFocusNodeRequest = null;
    }
  },
});

function renderGeneralTab(editor) {
  return html`
    <settings-section title="Source">
      <editor-text-input
        label="Video ID or URL"
        placeholder="dQw4w9WgXcQ or full YouTube URL"
        .value=${editor.settingVideoId}
        @change=${(event) => {
          const parsed = tryParseYoutubeId(event.detail.value);
          editor.updateGlobalSettingsState({ settingVideoId: parsed });
        }}
      ></editor-text-input>
      <editor-select
        label="Playlist mode"
        .value=${editor.settingListType}
        .options=${[
          { label: "None (single video)", value: "" },
          { label: "Playlist", value: "playlist" },
          { label: "User uploads", value: "user_uploads" },
        ]}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingListType: event.detail.value,
          });
        }}
      ></editor-select>
      <editor-text-input
        label=${
          editor.settingListType === "user_uploads"
            ? "YouTube channel/user name"
            : "Playlist ID or URL"
        }
        placeholder=${
          editor.settingListType === "user_uploads"
            ? "username"
            : "PLxxxxxxxxxxxxxx"
        }
        .value=${editor.settingListId}
        @change=${(event) => {
          const parsed = tryParseYoutubeListId(event.detail.value);
          editor.updateGlobalSettingsState({ settingListId: parsed });
        }}
      ></editor-text-input>
    </settings-section>

    <settings-section
      title="Layout"
      ?overridden=${editor.hasAnyOverriddenKeys("settingAspectRatio")}
    >
      <editor-select
        label="Aspect ratio"
        .value=${editor.settingAspectRatio}
        .options=${[
          { label: "16:9 (widescreen)", value: "16:9" },
          { label: "21:9 (cinematic)", value: "21:9" },
          { label: "4:3", value: "4:3" },
          { label: "1:1 (square)", value: "1:1" },
          { label: "9:16 (vertical)", value: "9:16" },
        ]}
        @change=${(event) => {
          editor.updateResponsiveSettingsState({
            settingAspectRatio: event.detail.value,
          });
        }}
      ></editor-select>
    </settings-section>
  `;
}

function renderPlaybackTab(editor) {
  return html`
    <settings-section title="Playback">
      ${boolSelect(editor, "settingAutoplay", "Autoplay")}
      ${boolSelect(editor, "settingControls", "Show player controls")}
      ${boolSelect(editor, "settingLoop", "Loop video")}
      ${boolSelect(editor, "settingPlaysinline", "Play inline on iOS")}
    </settings-section>

    <settings-section title="Time range">
      <editor-text-input
        label="Start (seconds)"
        type="number"
        min=${0}
        placeholder="0"
        .value=${editor.settingStart}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingStart: event.detail.value,
          });
        }}
      ></editor-text-input>
      <editor-text-input
        label="End (seconds)"
        type="number"
        min=${0}
        placeholder=""
        .value=${editor.settingEnd}
        @change=${(event) => {
          editor.updateGlobalSettingsState({ settingEnd: event.detail.value });
        }}
      ></editor-text-input>
    </settings-section>
  `;
}

function renderPlayerTab(editor) {
  return html`
    <settings-section title="Appearance">
      <editor-select
        label="Progress bar color"
        .value=${editor.settingColor}
        .options=${[
          { label: "Red (default)", value: "red" },
          { label: "White", value: "white" },
        ]}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingColor: event.detail.value,
          });
        }}
      ></editor-select>
      ${boolSelect(editor, "settingFs", "Show fullscreen button")}
      ${boolSelect(editor, "settingIvLoadPolicy", "Show video annotations")}
      ${boolSelect(
        editor,
        "settingRel",
        "Show related videos from any channel",
      )}
      ${boolSelect(editor, "settingDisablekb", "Disable keyboard controls")}
    </settings-section>

    <settings-section title="Captions & language">
      ${boolSelect(editor, "settingCcLoadPolicy", "Force closed captions on")}
      <editor-text-input
        label="Caption language (cc_lang_pref)"
        placeholder="en, fr, de…"
        .value=${editor.settingCcLangPref}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingCcLangPref: event.detail.value,
          });
        }}
      ></editor-text-input>
      <editor-text-input
        label="Interface language (hl)"
        placeholder="en, fr, de…"
        .value=${editor.settingHl}
        @change=${(event) => {
          editor.updateGlobalSettingsState({ settingHl: event.detail.value });
        }}
      ></editor-text-input>
    </settings-section>

    <settings-section title="JavaScript API">
      ${boolSelect(editor, "settingEnablejsapi", "Enable JavaScript API")}
      <editor-text-input
        label="Origin"
        placeholder="https://your-site.com"
        .value=${editor.settingOrigin}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingOrigin: event.detail.value,
          });
        }}
      ></editor-text-input>
      <editor-text-input
        label="Widget referrer"
        placeholder="https://your-site.com/page"
        .value=${editor.settingWidgetReferrer}
        @change=${(event) => {
          editor.updateGlobalSettingsState({
            settingWidgetReferrer: event.detail.value,
          });
        }}
      ></editor-text-input>
    </settings-section>
  `;
}

function boolSelect(editor, key, label) {
  return html`<editor-select
    label=${label}
    .value=${String(Boolean(editor[key]))}
    .options=${[
      { label: "No", value: "false" },
      { label: "Yes", value: "true" },
    ]}
    @change=${(event) => {
      editor.updateGlobalSettingsState({
        [key]: event.detail.value === "true",
      });
    }}
  ></editor-select>`;
}

export const editorRenderYoutube = (
  node,
  pageConfig,
  onPageConfigUpdated,
  renderNode,
  renderOptions = {},
) => {
  return html`<owb-youtube
    class=${renderOptions.hostClass || ""}
    style=${renderOptions.hostStyle || ""}
    data-grid-child-id=${renderOptions.hostDataGridChildId || ""}
    .node=${node}
    .pageConfig=${pageConfig}
    @page-config-updated=${onPageConfigUpdated}
  ></owb-youtube>`;
};

if (!customElements.get("owb-youtube")) {
  customElements.define("owb-youtube", OwbYoutube);
}
