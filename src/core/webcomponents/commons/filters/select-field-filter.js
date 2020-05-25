/**
 * Copyright 2015-2019 OpenCB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {LitElement, html} from "/web_modules/lit-element.js";
import UtilsNew from "./../../../utilsNew.js";


/** NOTE - Design choice: in case of single mode (this.multiple=false), in order to show the placeholder ("Select an option") and NOT adding a dummy option to allow null selection,
 *  the single selection mode is implemented still with the multiple flag in bootstrap-select, but forcing 1 selection with data-max-options=1
 *  (this has no consequences for the developer point of view)
 *
 *  Usage:
 * <select-field-filter .data="${["A","B","C"]}" .value=${"A"} @filterChange="${e => console.log(e)}"></select-field-filter>
 * <select-field-filter .data="${[{id: "a", name: "A", {id:"b", name: "B"}, {id: "c", name: "C"}]}" .value=${"a"} @filterChange="${e => console.log(e)}"></select-field-filter>
 */

export default class SelectFieldFilter extends LitElement {

    constructor() {
        super();

        // Set status and init private properties
        this._init();
    }

    createRenderRoot() {
        return this;
    }

    static get properties() {
        return {
            // NOTE value (default Values) can be either a single value as string or a comma separated list (this decision is due to easily manage default values in case of array of objects)
            value: {
                type: String
            },
            placeholder: {
                type: String
            },
            multiple: {
                type: Boolean
            },
            disabled: {
                type: Boolean
            },
            required: {
                type: Boolean
            },
            maxOptions: {
                type: Number
            },
            // the expected format is either an array of string or an array of objects {id, name}
            data: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "sff-" + UtilsNew.randomString(6);

        this.multiple = false;
        this.data = [];
        this.elm = this._prefix + "selectpicker";
    }

    firstUpdated() {
        this.selectPicker = $("#" + this.elm, this);
        this.selectPicker.selectpicker("val", "");
    }

    updated(_changedProperties) {
        if (_changedProperties.has("data")) {
            // TODO check why lit-element execute this for all existing select-field-filter instances..wtf
            // console.log("data",this.data)
            this.selectPicker.selectpicker("refresh");
        }
        if (_changedProperties.has("value")) {
            // TODO FIXME force null to "CUSTOM" works in 1 case out of 2 in variant-filter-clinical..
            //$(".selectpicker", this).selectpicker("val", this.value ? (this.multiple ? this.value.split(",") : this.value) : "CUSTOM");
            this.selectPicker.selectpicker("val", this.value ? (this.multiple ? this.value.split(",") : this.value) : "");
            //this.requestUpdate()
            //$(".selectpicker", this).selectpicker("refresh");
        }
        if (_changedProperties.has("disabled")) {
            this.selectPicker.selectpicker("refresh");
        }
    }

    filterChange(e) {
        const selection = this.selectPicker.selectpicker("val");
        let val;
        if (selection && selection.length) {
            val = this.multiple ? selection.join(",") : selection[0];
        }
        //this.value = val ? val : null; // this allow users to get the selected values using DOMElement.value
        const event = new CustomEvent("filterChange", {
            detail: {
                value: val ? val : null
            },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    render() {
        return html`
            <div id="${this._prefix}-select-field-filter-wrapper" class="form-group">
                <select id="${this.elm}"
                        class="${this.elm}"
                        multiple
                        ?disabled=${this.disabled}
                        ?required=${this.required}
                        title="${this.placeholder ? this.placeholder : "Select an option"}"
                        data-max-options="${!this.multiple ? 1 : this.maxOptions ? this.maxOptions : false}" 
                        @change="${this.filterChange}" data-width="100%">
                    ${this.data.map(opt => html`
                        ${opt.separator ? html`<option data-divider="true"></option>` : html`
                            ${opt.fields ? html`
                                <optgroup label="${opt.name}">${opt.fields.map(subopt => html`
                                    ${UtilsNew.isObject(subopt) ? html`
                                        <option ?disabled="${subopt.disabled}" ?selected="${subopt.selected}" .value="${subopt.id ? subopt.id : subopt.name}">${subopt.name}</option>    
                                    ` : html`
                                        <option>${subopt}</option>
                                    `}
                                    `)}
                                </optgroup>
                                ` : html` 
                                    ${UtilsNew.isObject(opt) ? html`
                                        <option ?disabled="${opt.disabled}" ?selected="${opt.selected}" .value="${opt.id ? opt.id : opt.name}">${opt.name}</option>
                                    ` : html`
                                        <option>${opt}</option>
                                `}
                            `}
                        `}
                    `)}
                </select>
            </div>
        `;
    }

}

customElements.define("select-field-filter", SelectFieldFilter);
