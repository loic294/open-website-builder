# Refactor: Collapse `*Editor` LitElements into runtime components via plugin

## Goal

Eliminate the duplicate `Owb*Editor` LitElement layer for layout components.
Only the runtime components (`OwbSection`, `OwbContainer`, `OwbForm`,
`OwbCollection`) should exist. All editor-only behavior must live in the
`editorPlugin` static and a thin **overlay element** rendered as a slotted
child — never as a separate component definition that the renderer mounts in
place of the runtime element.

## End state

- `customElements` registry contains: `owb-section`, `owb-container`,
  `owb-form`, `owb-collection`. No `owb-*-editor` tags.
- The `OwbLayoutContainerEditor` class is **deleted**.
- `editorRenderSection` / `editorRenderContainer` / `editorRenderForm` /
  `editorRenderCollection` mount the runtime component with light-DOM
  children + a slotted `<owb-layout-editor-overlay>` for chrome.
- `editorPlugin` on each runtime component handles:
  - `onConnected` / `onDisconnected` — wire SettingsController, active-owner
    listener.
  - `onPointerDown` — open section settings.
  - `onUpdated` — sync responsive CSS / spacing if needed.
- A single new overlay element `OwbLayoutEditorOverlay`
  (`<owb-layout-editor-overlay>`) owns:
  - block picker, section controls (add/move/delete), resize handle,
    grid overlay, global grid handles, add-section buttons.
  - It receives `node`, `pageConfig`, `onPageConfigUpdated`, and a `variant`
    (`section` | `container` | `form` | `collection`) prop to toggle the
    section-only chrome.

## Architecture decisions

- **Approach**: "Plugin adds slotted overlays" — base runtime template renders
  alignment-aware container and `<slot>`; overlay is a sibling `<slot
name="editor-overlay">`.
- **Scope**: All four layout editors at once.
- **Children rendering**: child nodes are rendered as light-DOM by the
  editor render function (not via `renderNodeFn` on the host), so the
  runtime component does not need editor knowledge of `renderNodeFn`.

---

## Phase 0 — Prep

- [ ] Read full current `OwbLayoutContainerEditor` (already in context).
- [ ] Confirm every method on the class is callable from either
      `editorPlugin` hooks or the overlay (no hidden binding to host element
      identity beyond `node` / `pageConfig`).
- [ ] Inventory `editorRender*` callers in
      [src/website/components/components.js](open-website-builder/src/website/components/components.js)
      to know the exact API contract to preserve.

## Phase 1 — Extend runtime components with alignment + slot

Apply to each of: [section.js](open-website-builder/src/website/components/site-section/section.js),
[container.js](open-website-builder/src/website/components/container/container.js),
[form.js](open-website-builder/src/website/components/form/form.js),
[collection.js](open-website-builder/src/website/components/collection/collection.js).

- [ ] Move `getSectionInlineStyle` / `getContainerInlineStyle` logic into
      runtime render so alignment modes (flex / grid / visual / other) work
      identically in published and editor modes.
- [ ] Add `<slot name="editor-overlay"></slot>` inside the `<section>` /
      container element (positioned absolutely via CSS in editor mode).
- [ ] Add `data-editor-block` attribute (only when `editorPlugin` non-null)
      to the inner container — required by descendant pointerdown ignore
      logic in parents.
- [ ] Verify published output is unchanged (slot empty → no chrome).

## Phase 2 — Build `OwbLayoutEditorOverlay`

New file: `open-website-builder/src/website/components/site-section/layout-editor-overlay.js`.

- [ ] Class `OwbLayoutEditorOverlay extends withVariantConfig(LitElement)`.
- [ ] Properties: `node`, `pageConfig`, `variant`
      (`"section" | "container" | "form" | "collection"`), all `setting*`
      reactive props, `isBlockPickerOpen`, `blockPickerType`,
      `globalGridHandlePosition`, `hoveredGridChildId`,
      `activeGridPointerState`, `activeSectionResizeState`,
      `forceGridOverlayVisible`, `showGridPreviewOverlay`,
      `sharedComponentOptions`, `replaceWithSharedComponentId`, plus
      `SETTINGS_HOST_PROPERTIES`.
- [ ] Owns `SettingsController` (`focusRouter: true`).
- [ ] Implements (moved verbatim from `OwbLayoutContainerEditor`):
      `openSectionSettings`, `onSectionPointerDown`,
      `onGridContainerPointerMove`, `onSectionPointerLeave`,
      `startGridPointerInteraction` + handlers,
      `startSectionResize` + handlers, `addChildBlock`,
      `moveChildBlock`, `deleteTrackedChildBlock`,
      `updateSectionContent`, `addSection`, `moveSection`, `deleteSection`,
      `replaceCurrentSectionWithSharedComponent`,
      `loadSharedComponentOptions`,
      grid placement helpers, default settings state.
- [ ] Variant-driven flags replace `shouldShow*` overrides:
      `section` → add-buttons, reorder, delete, shared-replace = true;
      `container`/`form`/`collection` → all false.
- [ ] Per-variant `renderGeneralSettingsExtras()` (collection needs the
      collection-id / sort / count fields — port from
      [collection.editor.js](open-website-builder/src/website/components/collection/collection.editor.js);
      form needs form action/method fields — port from
      [form.editor.js](open-website-builder/src/website/components/form/form.editor.js)).
- [ ] `render()` returns the chrome only (no children): grid preview overlay,
      global grid handles, section-controls bar, block picker, resize handle,
      add-section buttons. Positioned absolutely over the parent section.
- [ ] Dispatches `page-config-updated` upward; parent renderer relays it.

## Phase 3 — Wire `editorPlugin` on each runtime component

- [ ] On each of `OwbSection`, `OwbContainer`, `OwbForm`, `OwbCollection`,
      set `editorPlugin` from the editor render module with:
  - `onPointerDown(el)` → find the slotted `<owb-layout-editor-overlay>` and
    call `overlay.openSectionSettings()`.
  - `onConnected(el)` → no-op or active-owner CSS class toggle.
- [ ] Remove the bespoke `data-editor-block` + `_onActiveOwnerChanged` logic
      from `container.js` (move CSS class toggling to a generic helper if
      still needed).

## Phase 4 — Rewrite `editorRender*` functions

For each layout type:

- [ ] Replace `<owb-*-editor>` with:
      `html
                <owb-section .node=... .pageConfig=...>
                      <!-- light-DOM children -->
                      ${childNodes.map(renderChild)}
                      <owb-layout-editor-overlay
                            slot="editor-overlay"
                            variant="section"
                            .node=...
                            .pageConfig=...
                            @page-config-updated=${onPageConfigUpdated}
                      ></owb-layout-editor-overlay>
                </owb-section>
                `
- [ ] Children for grid mode get `slot=""` + `style="grid-column:..."` +
      `data-grid-child-id` applied by the render function (overlay reads
      placements via DOM query / shared state, not via `renderNodeFn`).
- [ ] Delete `renderNodeFn` plumbing from runtime components.

## Phase 5 — Delete dead code

- [ ] Delete `OwbLayoutContainerEditor` class from
      [site-section.js](open-website-builder/src/website/components/site-section/site-section.js).
- [ ] Delete `OwbSectionEditor` class and `customElements.define("owb-section-editor", ...)`.
- [ ] Delete [container.editor.js](open-website-builder/src/website/components/container/container.editor.js)
      `OwbContainerEditor` class and its registration; keep `editorRenderContainer`.
- [ ] Delete `OwbFormEditor` from
      [form.editor.js](open-website-builder/src/website/components/form/form.editor.js);
      keep `editorRenderForm`.
- [ ] Delete `OwbCollectionEditor` from
      [collection.editor.js](open-website-builder/src/website/components/collection/collection.editor.js);
      keep `editorRenderCollection`.
- [ ] Remove `_onActiveOwnerChanged`/`isSettingsOpen` from runtime container
      if superseded by overlay's active-owner handling.

## Phase 6 — Verify

- [ ] `cd open-website-builder && npm run publish` → expect
      `✓ 1747 modules transformed`, `Published 162 page(s)`, 0 errors.
- [ ] Manual smoke test in editor UI:
  - [ ] Click empty area of section → settings open with General + Design tabs.
  - [ ] Select section from tree → same panel opens (focus routing works).
  - [ ] Add/move/delete section buttons work.
  - [ ] Block picker inserts blocks.
  - [ ] Grid mode: drag-move and resize a child via global handles.
  - [ ] Section resize handle resizes (visual mode → rows; other → min-height).
  - [ ] Replace-with-shared-component flow works.
  - [ ] Container, form, collection variants open their settings (no
        section-only chrome).
- [ ] `customElements.get("owb-section-editor")` → `undefined` in dev console.
- [ ] No `EditorComponent`/`EditorHostBase` imports remain outside
      `src/editor/components/layout/editor-component/`.

## Risks & rollback

- Slotted overlay positioning may regress styling for absolutely-positioned
  chrome (add-section buttons, resize handle). Mitigation: keep existing CSS
  selectors but re-scope to overlay's shadow DOM and use `:host` for
  positioning anchors.
- Grid child placement currently goes through `renderNodeFn`. Switching to
  light-DOM children requires the editor render function to apply
  `grid-column` / `grid-row` inline styles directly on each child host
  element — verify `withVariantConfig` hosts accept arbitrary `style` attrs.
- Active-settings-owner CSS state (`.is-settings-open`,
  `.is-focus-locked`) currently lives on the inner `<section>` of the
  editor component. Migrate by toggling a class on the runtime component's
  host via `editorPlugin.onUpdated`.

## Out of scope

- No changes to non-layout plugin components (image/text/button/etc.).
- No changes to `SettingsController` or `EditorComponent` singleton.
- No changes to data model or persisted JSON shape.
