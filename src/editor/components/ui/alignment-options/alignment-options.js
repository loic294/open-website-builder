import { LitElement, html, unsafeCSS } from "lit";
import {
  AlignStartVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  Columns2,
  ArrowDown,
  ArrowUp,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignHorizontalDistributeCenter,
  Grip,
  Ellipsis,
  MousePointerClick,
} from "lucide";
import styles from "./styles.css?inline";

const DEFAULT_VALUE = {
  mode: "block",
  flexDirection: "row",
  gap: "",
  rowHeight: "30px",
  flexHorizontal: "start",
  flexVertical: "start",
  flexJustifyContent: "flex-start",
  flexAlignItems: "flex-start",
  flexAlignContent: "stretch",
  gridRows: 2,
  gridColumns: 2,
  gridHorizontal: "start",
  gridVertical: "start",
  gridJustifyItems: "start",
  gridAlignItems: "start",
  gridJustifyContent: "start",
  gridAlignContent: "start",
  otherAlignment: "block",
};

const MORE_VALUE = "__more__";

export class EditorAlignmentOptions extends LitElement {
  static styles = unsafeCSS(styles);

  static properties = {
    value: { type: Object },
    flexJustifyShowMore: { state: true },
    flexAlignShowMore: { state: true },
    flexAlignContentShowMore: { state: true },
    gridJustifyShowMore: { state: true },
    gridAlignShowMore: { state: true },
    gridAlignContentShowMore: { state: true },
  };

  constructor() {
    super();
    this.value = { ...DEFAULT_VALUE };
    this.flexJustifyShowMore = false;
    this.flexAlignShowMore = false;
    this.flexAlignContentShowMore = false;
    this.gridJustifyShowMore = false;
    this.gridAlignShowMore = false;
    this.gridAlignContentShowMore = false;
    this.gridPreviewFocusCount = 0;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.gridPreviewFocusCount = 0;
    this.dispatchGridOverlayVisibility(false);
  }

  dispatchGridOverlayVisibility(visible) {
    this.dispatchEvent(
      new CustomEvent("grid-overlay-visibility-change", {
        detail: { visible },
        bubbles: true,
        composed: true,
      }),
    );
  }

  onGridPreviewFieldFocus() {
    this.gridPreviewFocusCount += 1;
    if (this.gridPreviewFocusCount === 1) {
      this.dispatchGridOverlayVisibility(true);
    }
  }

  onGridPreviewFieldBlur() {
    this.gridPreviewFocusCount = Math.max(0, this.gridPreviewFocusCount - 1);
    if (this.gridPreviewFocusCount === 0) {
      this.dispatchGridOverlayVisibility(false);
    }
  }

  get normalizedValue() {
    return {
      ...DEFAULT_VALUE,
      ...(this.value && typeof this.value === "object" ? this.value : {}),
    };
  }

  emitChange(nextPartialValue) {
    const nextValue = {
      ...this.normalizedValue,
      ...nextPartialValue,
    };

    this.value = nextValue;
    this.dispatchEvent(
      new CustomEvent("alignment-change", {
        detail: { value: nextValue },
        bubbles: true,
        composed: true,
      }),
    );
  }

  onModeChange(mode) {
    if (mode !== "grid" && mode !== "visual") {
      this.gridPreviewFocusCount = 0;
      this.dispatchGridOverlayVisibility(false);
    }
    this.emitChange({ mode });
  }

  onFlexDirectionChange(direction) {
    this.emitChange({ flexDirection: direction });
  }

  onFlexHorizontalChange(horizontal) {
    this.emitChange({
      flexHorizontal: horizontal,
      flexJustifyContent: horizontal,
    });
  }

  onFlexVerticalChange(vertical) {
    this.emitChange({
      flexVertical: vertical,
      flexAlignItems: vertical,
    });
  }

  onGridHorizontalChange(horizontal) {
    this.emitChange({
      gridHorizontal: horizontal,
      gridJustifyItems: horizontal,
    });
  }

  onGridVerticalChange(vertical) {
    this.emitChange({
      gridVertical: vertical,
      gridAlignItems: vertical,
    });
  }

  renderPrimaryWithMore({
    title,
    value,
    commonOptions,
    allOptions,
    showMore,
    setShowMore,
    onChange,
  }) {
    const commonValues = new Set(commonOptions.map((option) => option.value));
    const missingOptions = allOptions.filter(
      (option) => !commonValues.has(option.value),
    );

    const isUsingMissing = !commonValues.has(value);
    const radioValue = isUsingMissing ? MORE_VALUE : value;

    return html`
      <div class="option-group">
        <div class="option-group-title">${title}</div>
        <editor-radio-button
          .options=${[
            ...commonOptions,
            {
              label: "More",
              value: MORE_VALUE,
              icon: Ellipsis,
              tooltip: "More",
            },
          ]}
          .value=${radioValue}
          @change=${(e) => {
            const nextValue = e.detail.value;
            if (nextValue === MORE_VALUE) {
              setShowMore(true);
              return;
            }

            setShowMore(false);
            onChange(nextValue);
          }}
        ></editor-radio-button>
        ${showMore || isUsingMissing
          ? html`
              <editor-select
                label="More options"
                .options=${missingOptions}
                .value=${isUsingMissing
                  ? value
                  : missingOptions[0]?.value || ""}
                @change=${(e) => onChange(e.detail.value)}
              ></editor-select>
            `
          : html``}
      </div>
    `;
  }

  renderOptionGroup(title, onChange, selectedValue, options) {
    return html`
      <div class="option-group">
        <div class="option-group-title">${title}</div>
        <editor-radio-button
          .options=${options}
          .value=${selectedValue}
          @change=${(e) => onChange(e.detail.value)}
        ></editor-radio-button>
      </div>
    `;
  }

  renderModeSelector(value) {
    const options = [
      { label: "Block", value: "block", icon: AlignLeft, tooltip: "Block" },
      {
        label: "Visual",
        value: "visual",
        icon: MousePointerClick,
        tooltip: "Visual",
      },
      { label: "Flex", value: "flex", icon: Columns2, tooltip: "Flex" },
      { label: "Grid", value: "grid", icon: Grip, tooltip: "Grid" },
      { label: "Other", value: "other", icon: Ellipsis, tooltip: "Other" },
    ];

    return html`
      <editor-radio-button
        .options=${options}
        .value=${value.mode}
        @change=${(e) => this.onModeChange(e.detail.value)}
      ></editor-radio-button>
    `;
  }

  renderVisualOptions(value) {
    return html`<div class="gap-row">
        <editor-text-input
          label="Gap"
          placeholder="16px"
          .value=${String(value.gap || "")}
          @change=${(e) => this.emitChange({ gap: e.detail.value })}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
        <editor-text-input
          label="Row height"
          placeholder="30px"
          .value=${String(value.rowHeight || "")}
          @change=${(e) => this.emitChange({ rowHeight: e.detail.value })}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
      </div>
      <div class="grid-size-row">
        <editor-text-input
          type="number"
          label="Columns"
          min=${1}
          .value=${String(value.gridColumns)}
          @change=${(event) => {
            const nextColumns = Math.max(
              1,
              Number.parseInt(event.detail.value, 10) || 1,
            );
            this.emitChange({ gridColumns: nextColumns });
          }}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
        <editor-text-input
          type="number"
          label="Rows"
          min=${1}
          .value=${String(value.gridRows)}
          @change=${(event) => {
            const nextRows = Math.max(
              1,
              Number.parseInt(event.detail.value, 10) || 1,
            );
            this.emitChange({ gridRows: nextRows });
          }}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
      </div> `;
  }

  renderFlexOptions(value) {
    const directionOptions = [
      {
        value: "row",
        label: "Row",
        icon: ArrowLeftRight,
        tooltip: "Direction: row",
      },
      {
        value: "column",
        label: "Column",
        icon: ArrowUpDown,
        tooltip: "Direction: column",
      },
    ];

    const justifyCommon = [
      {
        value: "flex-start",
        label: "Start",
        icon: AlignStartVertical,
        tooltip: "Justify content: start",
      },
      {
        value: "center",
        label: "Center",
        icon: AlignCenterHorizontal,
        tooltip: "Justify content: center",
      },
      {
        value: "flex-end",
        label: "End",
        icon: AlignEndVertical,
        tooltip: "Justify content: end",
      },
      {
        value: "space-between",
        label: "Between",
        icon: AlignHorizontalSpaceBetween,
        tooltip: "Justify content: space-between",
      },
      {
        value: "space-around",
        label: "Around",
        icon: AlignHorizontalSpaceAround,
        tooltip: "Justify content: space-around",
      },
      {
        value: "space-evenly",
        label: "Evenly",
        icon: AlignHorizontalDistributeCenter,
        tooltip: "Justify content: space-evenly",
      },
    ];
    const justifyAll = [
      ...justifyCommon,
      { value: "stretch", label: "Stretch" },
      { value: "start", label: "Start (logical)" },
      { value: "end", label: "End (logical)" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ];

    const alignCommon = [
      {
        value: "flex-start",
        label: "Start",
        icon: ArrowUp,
        tooltip: "Align items: start",
      },
      {
        value: "center",
        label: "Center",
        icon: AlignCenter,
        tooltip: "Align items: center",
      },
      {
        value: "flex-end",
        label: "End",
        icon: ArrowDown,
        tooltip: "Align items: end",
      },
      {
        value: "stretch",
        label: "Stretch",
        icon: ArrowUpDown,
        tooltip: "Align items: stretch",
      },
      {
        value: "baseline",
        label: "Baseline",
        icon: Grip,
        tooltip: "Align items: baseline",
      },
      {
        value: "self-start",
        label: "Self start",
        icon: ArrowUp,
        tooltip: "Align items: self-start",
      },
    ];
    const alignAll = [
      ...alignCommon,
      { value: "self-end", label: "Self end" },
      { value: "normal", label: "Normal" },
      { value: "safe center", label: "Safe center" },
      { value: "unsafe center", label: "Unsafe center" },
    ];

    return html`
      <div class="gap-row">
        <editor-text-input
          label="Gap"
          placeholder="16px"
          .value=${String(value.gap || "")}
          @change=${(e) => this.emitChange({ gap: e.detail.value })}
        ></editor-text-input>
        <editor-text-input
          label="Row height"
          placeholder="30px"
          .value=${String(value.rowHeight || "")}
          @change=${(e) => this.emitChange({ rowHeight: e.detail.value })}
        ></editor-text-input>
      </div>
      <settings-collapsable title="More options">
        ${this.renderOptionGroup(
          "Direction",
          (next) => this.onFlexDirectionChange(next),
          value.flexDirection,
          directionOptions,
        )}
        ${this.renderPrimaryWithMore({
          title: "Justify content",
          value: value.flexJustifyContent,
          commonOptions: justifyCommon,
          allOptions: justifyAll,
          showMore: this.flexJustifyShowMore,
          setShowMore: (next) => {
            this.flexJustifyShowMore = next;
          },
          onChange: (next) => {
            this.onFlexHorizontalChange(next);
          },
        })}
        ${this.renderPrimaryWithMore({
          title: "Align items",
          value: value.flexAlignItems,
          commonOptions: alignCommon,
          allOptions: alignAll,
          showMore: this.flexAlignShowMore,
          setShowMore: (next) => {
            this.flexAlignShowMore = next;
          },
          onChange: (next) => {
            this.onFlexVerticalChange(next);
          },
        })}
      </settings-collapsable>
    `;
  }

  renderGridOptions(value) {
    const justifyCommon = [
      {
        value: "start",
        label: "Start",
        icon: AlignLeft,
        tooltip: "Justify items: start",
      },
      {
        value: "center",
        label: "Center",
        icon: AlignCenter,
        tooltip: "Justify items: center",
      },
      {
        value: "end",
        label: "End",
        icon: AlignRight,
        tooltip: "Justify items: end",
      },
      {
        value: "stretch",
        label: "Stretch",
        icon: ArrowLeftRight,
        tooltip: "Justify items: stretch",
      },
      {
        value: "left",
        label: "Left",
        icon: AlignLeft,
        tooltip: "Justify items: left",
      },
      {
        value: "right",
        label: "Right",
        icon: AlignRight,
        tooltip: "Justify items: right",
      },
    ];
    const justifyAll = [
      ...justifyCommon,
      { value: "self-start", label: "Self start" },
      { value: "self-end", label: "Self end" },
      { value: "legacy", label: "Legacy" },
    ];

    const alignCommon = [
      {
        value: "start",
        label: "Start",
        icon: ArrowUp,
        tooltip: "Align items: start",
      },
      {
        value: "center",
        label: "Center",
        icon: AlignCenter,
        tooltip: "Align items: center",
      },
      {
        value: "end",
        label: "End",
        icon: ArrowDown,
        tooltip: "Align items: end",
      },
      {
        value: "stretch",
        label: "Stretch",
        icon: ArrowUpDown,
        tooltip: "Align items: stretch",
      },
      {
        value: "baseline",
        label: "Baseline",
        icon: Grip,
        tooltip: "Align items: baseline",
      },
      {
        value: "self-start",
        label: "Self start",
        icon: ArrowUp,
        tooltip: "Align items: self-start",
      },
    ];
    const alignAll = [
      ...alignCommon,
      { value: "self-end", label: "Self end" },
      { value: "legacy", label: "Legacy" },
    ];

    const contentAxisOptions = [
      {
        value: "start",
        label: "Start",
        icon: ArrowUp,
        tooltip: "Align content: start",
      },
      {
        value: "center",
        label: "Center",
        icon: AlignCenter,
        tooltip: "Align content: center",
      },
      {
        value: "end",
        label: "End",
        icon: ArrowDown,
        tooltip: "Align content: end",
      },
      {
        value: "stretch",
        label: "Stretch",
        icon: ArrowUpDown,
        tooltip: "Align content: stretch",
      },
      {
        value: "space-between",
        label: "Between",
        icon: ArrowUpDown,
        tooltip: "Align content: space-between",
      },
      {
        value: "space-around",
        label: "Around",
        icon: ArrowUpDown,
        tooltip: "Align content: space-around",
      },
    ];
    const contentAxisMissingOptions = [
      { label: "Space evenly", value: "space-evenly" },
      { label: "Baseline", value: "baseline" },
      { label: "First baseline", value: "first baseline" },
      { label: "Last baseline", value: "last baseline" },
      { label: "Normal", value: "normal" },
    ];

    return html`
      <div class="gap-row">
        <editor-text-input
          label="Gap"
          placeholder="16px"
          .value=${String(value.gap || "")}
          @change=${(e) => this.emitChange({ gap: e.detail.value })}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
        <editor-text-input
          label="Row height"
          placeholder="30px"
          .value=${String(value.rowHeight || "")}
          @change=${(e) => this.emitChange({ rowHeight: e.detail.value })}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
      </div>
      <div class="grid-size-row">
        <editor-text-input
          type="number"
          label="Columns"
          min=${1}
          .value=${String(value.gridColumns)}
          @change=${(event) => {
            const nextColumns = Math.max(
              1,
              Number.parseInt(event.detail.value, 10) || 1,
            );
            this.emitChange({ gridColumns: nextColumns });
          }}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
        <editor-text-input
          type="number"
          label="Rows"
          min=${1}
          .value=${String(value.gridRows)}
          @change=${(event) => {
            const nextRows = Math.max(
              1,
              Number.parseInt(event.detail.value, 10) || 1,
            );
            this.emitChange({ gridRows: nextRows });
          }}
          @editor-focus=${() => this.onGridPreviewFieldFocus()}
          @editor-blur=${() => this.onGridPreviewFieldBlur()}
        ></editor-text-input>
      </div>
      <settings-collapsable title="More options">
        ${this.renderPrimaryWithMore({
          title: "Justify content",
          value: value.gridJustifyContent,
          commonOptions: justifyCommon,
          allOptions: justifyAll,
          showMore: this.gridJustifyShowMore,
          setShowMore: (next) => {
            this.gridJustifyShowMore = next;
          },
          onChange: (next) => {
            this.emitChange({ gridJustifyContent: next });
          },
        })}
        ${this.renderPrimaryWithMore({
          title: "Align items",
          value: value.gridAlignItems,
          commonOptions: alignCommon,
          allOptions: alignAll,
          showMore: this.gridAlignShowMore,
          setShowMore: (next) => {
            this.gridAlignShowMore = next;
          },
          onChange: (next) => {
            this.onGridVerticalChange(next);
          },
        })}
        ${this.renderPrimaryWithMore({
          title: "Align content",
          value: value.gridAlignContent,
          commonOptions: contentAxisOptions,
          allOptions: [...contentAxisOptions, ...contentAxisMissingOptions],
          showMore: this.gridAlignContentShowMore,
          setShowMore: (next) => {
            this.gridAlignContentShowMore = next;
          },
          onChange: (next) => {
            this.emitChange({ gridAlignContent: next });
          },
        })}
      </settings-collapsable>
    `;
  }

  renderOtherOptions(value) {
    const options = [
      { label: "Block", value: "block" },
      { label: "Inline", value: "inline" },
      { label: "Inline block", value: "inline-block" },
      { label: "Contents", value: "contents" },
      { label: "Flow root", value: "flow-root" },
      { label: "List item", value: "list-item" },
      { label: "Table", value: "table" },
      { label: "Table row", value: "table-row" },
      { label: "Table cell", value: "table-cell" },
      { label: "None", value: "none" },
    ];

    return html`
      <settings-collapsable title="More options">
        <editor-select
          label="Display"
          .options=${options}
          .value=${value.otherAlignment}
          @change=${(e) => this.emitChange({ otherAlignment: e.detail.value })}
        ></editor-select>
      </settings-collapsable>
    `;
  }

  render() {
    const value = this.normalizedValue;

    return html`
      <div class="alignment-options">
        ${this.renderModeSelector(value)}
        ${value.mode === "visual"
          ? this.renderVisualOptions(value)
          : value.mode === "flex"
            ? this.renderFlexOptions(value)
            : value.mode === "grid"
              ? this.renderGridOptions(value)
              : this.renderOtherOptions(value)}
      </div>
    `;
  }
}

customElements.define("editor-alignment-options", EditorAlignmentOptions);
