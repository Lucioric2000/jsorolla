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
import UtilsNew from "./../../utilsNew.js";


export default class OpencbGridToolbar extends LitElement {

    constructor() {
        super();
        this._init();
    }

    createRenderRoot() {
        return this;
    }

    static get properties() {
        return {
            config: {
                type: Object
            }
        }
    }

    _init() {
        this._prefix = "grid" + UtilsNew.randomString(6);
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
    }


    updated(changedProperties) {
        if(changedProperties.has("config")) {
            this._config = {...this.getDefaultConfig(), ...this.config};
        }
    }

    onDownloadFile(e) {
        this.dispatchEvent(new CustomEvent("download", {
            detail: {
                option: e.target.dataset.downloadOption
            }, bubbles: true, composed: true
        }));
    }

    checkboxToggle(e) {
        // We undo the checkbox action. We will toggle it on a different event
        e.currentTarget.checked = !e.currentTarget.checked;
    }

    onColumnClick(e) {
        // We do this call to avoid the dropdown to be closed after the click
        e.stopPropagation();

        // Toggle the checkbox
        e.currentTarget.firstElementChild.checked = !e.currentTarget.firstElementChild.checked;
        this.dispatchEvent(new CustomEvent("columnChange", {
            detail: {
                id: e.currentTarget.dataset.columnId,
                selected: e.currentTarget.firstElementChild.checked
            }, bubbles: true, composed: true
        }));

    }

    onShareLink(e) {
        this.dispatchEvent(new CustomEvent("sharelink", {
            detail: {
            }, bubbles: true, composed: true
        }));
    }

    isTrue(value) {
        return UtilsNew.isUndefinedOrNull(value) || value;
    }

    getDefaultConfig() {
        return {
            label: "records",
            columns: [], // [{field: "fieldname", title: "title", visible: true, eligible: true}]
            download: ["Tab", "JSON"],
            showShareLink: false,
            buttons: ["columns", "download"]
        };
    }

    render(){
        return html`
            <style>
                .opencb-grid-toolbar .checkbox-container label:before {
                    margin-top: 5px;
                }
                .opencb-grid-toolbar {
                    margin-bottom: ${~this._config.buttons.indexOf("new") ? 10 : 5}px;
                }
            </style>
            <div class="opencb-grid-toolbar">
                <div class="row">
                    <div id="${this._prefix}ToolbarLeft" class="col-md-6">
                        ${~this._config.buttons.indexOf("new") ? html`<button type="button" class="btn btn-default ripple btn-sm">
                            <i id="${this._prefix}ColumnIcon" class="fa fa-columns icon-padding" aria-hidden="true"></i> New </span>
                        </button>` : null}
                    </div>
                    <div id="${this._prefix}toolbar" class="col-md-6">
                        <div class="form-inline text-right pull-right">
                            ${~this._config.buttons.indexOf("columns") && this._config.columns.length ? html`
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-default ripple btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                            <i id="${this._prefix}ColumnIcon" class="fa fa-columns icon-padding" aria-hidden="true"></i> Columns <span class="caret"></span>
                                        </button>
                                        <ul class="dropdown-menu btn-sm checkbox-container">
                                            ${this._config.columns.length ?
                                                this._config.columns.filter(item => item.eligible ?? true ).map(item => html`
                                                    <li>
                                                        <a data-column-id="${item.field}" @click="${this.onColumnClick}" style="cursor: pointer;">
                                                            <input type="checkbox" @click="${this.checkboxToggle}" .checked="${this.isTrue(item.visible)}"/>
                                                            <label class="checkmark-label">${item.title}</label>
                                                        </a>
                                                    </li>`)
                                                : null}
                                        </ul>
                                    </div>
                            ` : null }
            
                            ${~this._config.buttons.indexOf("download") ? html`
                                <div class="btn-group">
                                    <button type="button" class="btn btn-default ripple btn-sm dropdown-toggle" data-toggle="dropdown"
                                            aria-haspopup="true" aria-expanded="false">
                                        ${this.config?.downloading === true ? html`<i class="fa fa-spinner fa-spin" aria-hidden="true"></i>` : null}
                                        <i id="${this._prefix}DownloadIcon" class="fa fa-download icon-padding" aria-hidden="true"></i> Download <span class="caret"></span>
                                    </button>
                                    <ul class="dropdown-menu btn-sm">
                                        ${this._config.download.length ? this._config.download.map(item => html`
                                                <li><a href="javascript:;" data-download-option="${item}" @click="${this.onDownloadFile}">${item}</a></li>
                                        `) : null}
                                    </ul>
                                </div>
                            ` : null}
            
                            <!--Share URL-->
                            ${this.showShareLink ? html`
                                <button type="button" class="btn btn-default btn-sm" data-toggle="popover" data-placement="bottom" @click="onShareLink">
                                    <i class="fa fa-share-alt icon-padding" aria-hidden="true"></i> Share
                                </button>
                            ` : null }
                        </div>
                    </div>
                </div>
            </div>`;
    }

}
customElements.define("opencb-grid-toolbar", OpencbGridToolbar);
