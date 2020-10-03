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
import UtilsNew from "../../utilsNew.js";

// TODO reorganize props multiple/forceSelection

/** NOTE - Design choice: to allow deselection, the single mode (this.multiple=false), has been implemented with the multiple flag in bootstrap-select, but forcing 1 selection with data-max-options=1
 *  (this has no consequences for the developer point of view). This behaviour can be over overridden using "forceSelection" prop
 *
 *  Usage:
 * <select-field-filter .data="${["A","B","C"]}" .value=${"A"} @filterChange="${e => console.log(e)}"></select-field-filter>
 * <select-field-filter .data="${[{id: "a", name: "A"}, {id:"b", name: "B"}, {id: "c", name: "C"}]}" .value=${"a"} @filterChange="${e => console.log(e)}"></select-field-filter>
 */

export default class ToggleSwitch extends LitElement {

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
            value: {
                type: Boolean
            },
            onText: {
                type: String
            },
            offText: {
                type: String
            },
            activeClass: {
                type: String
            },
            inactiveClass: {
                type: String
            },
            disabled: {
                type: Boolean
            },
        };
    }

    _init() {
        this._prefix = UtilsNew.randomString(8);

        // Default values
        this.onText = "ON";
        this.offText = "OFF";
        this.activeClass = "btn-primary";
        this.inactiveClass = "btn-default";
    }

    updated(changedProperties) {
        if (changedProperties.has("value")) {
            this._value = this.value;
            if (this.value) {
                this._onClass = this.activeClass + " active";
                this._offClass = this.inactiveClass;
            } else {
                this._onClass = this.inactiveClass;
                this._offClass = this.activeClass + " active";
            }
            this.requestUpdate();
        }
        if (changedProperties.has("onText")) {
            this.onText = this.onText ? this.onText : "ON";
        }
        if (changedProperties.has("offText")) {
            this.offText = this.offText ? this.offText : "OFF";
        }
        if (changedProperties.has("activeClass")) {
            this.activeClass = this.activeClass ? this.activeClass : "btn-primary";
        }
        if (changedProperties.has("inactiveClass")) {
            this.inactiveClass = this.inactiveClass ? this.inactiveClass : "btn-default";
        }
    }

    onToggleClick(buttonId, e) {
        // Check if there is anything to do
        if ((this.value && buttonId === "ON") || (!this.value && buttonId === "OFF")) {
            return;
        }

        // Support several classes
        let activeClasses = this.activeClass.split(" ");
        let inactiveClasses = this.inactiveClass.split(" ");

        // Fetch and reset buttons status
        let buttons = this.getElementsByClassName("btn-toggle-" + this._prefix);
        buttons.forEach(button => button.classList.remove(...activeClasses, ...inactiveClasses, "active"));
        let onIndex = 0;
        let offIndex = 1;
        if (buttons[0].dataset.id === "OFF") {
            onIndex = 1;
            offIndex = 0;
        }

        // Set proper classes
        this.value = buttonId === "ON";
        if (this.value) {
            buttons[onIndex].classList.add(...activeClasses, "active");
            buttons[offIndex].classList.add(...inactiveClasses);
        } else {
            buttons[onIndex].classList.add(...inactiveClasses);
            buttons[offIndex].classList.add(...activeClasses, "active");
        }

        // Set the field status
        this.filterChange();
    }

    filterChange(e) {
        const event = new CustomEvent("filterChange", {
            detail: {
                value: this.value
            },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(event);
    }

    render() {
        return html`
            <div class="">
                <div class="btn-group btn-toggle"> 
                    <button class="btn ${this._onClass} btn-toggle-${this._prefix}" data-id="ON" 
                        @click="${e => this.onToggleClick("ON", e)}">${this.onText}</button>
                    <button class="btn ${this._offClass} btn-toggle-${this._prefix}" data-id="OFF" 
                        @click="${e => this.onToggleClick("OFF", e)}">${this.offText}</button>
                </div>
             </div>
        `;
    }

}

customElements.define("toggle-switch", ToggleSwitch);
