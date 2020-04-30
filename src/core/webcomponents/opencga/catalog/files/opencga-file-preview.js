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
import Utils from "./../../../../utils.js";


export default class OpencgaFilePreview extends LitElement {

    constructor() {
        super();
        this._init();
    }

    createRenderRoot() {
        return this;
    }

    static get properties() {
        return {
            opencgaSession: {
                type: Object
            },
            opencgaClient: {
                type: Object
            },
            file: {
                type: Object
            },
            active: {
                type: Object
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        // this.prefix = "osv" + Utils.randomString(6);
        this._config = this.getDefaultConfig();
        this.file = {};
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
    }


    firstUpdated(_changedProperties) {
    }

    updated(changedProperties) {
        if ((changedProperties.has("file") || changedProperties.has("active")) && this.active) {
            this.fileObserver();
        }
        if (changedProperties.has("config")) {
            this.configObserver();
        }
    }

    configObserver() {
    }

    fileObserver() {
        const params = {
            study: this.opencgaSession.project.alias + ":" + this.opencgaSession.study.alias,
            includeIndividual: true
        };

        const extension = this.file.id.split(".").pop();
        switch (extension) {
            case "log":
            case "err":
                this.contentType = "text";
                this.opencgaSession.opencgaClient.files().head(this.file.id, params)
                    .then( response => {
                        const {format, content} = response.getResult(0);
                        this.format = format;
                        this.content = content ?? "No content";
                        this.requestUpdate();
                    })
                    .catch( response => {
                        console.error(response);
                        this.content = response.getEvents("ERROR").map( _ => _.message).join("\n");
                        this.requestUpdate();
                    });
                break;
            case "png":
                this.contentType = "image";
                this.opencgaSession.opencgaClient.files().image(this.file.id, params)
                    .then( response => {
                        this.requestUpdate().then( () => this.querySelector("#thumbnail").src = "data:image/png;base64, " + response.getResult(0).content);
                    })
                    .catch( response => {
                        console.error(response);
                        //this.content = response.getEvents("ERROR").map( _ => _.message).join("\n");
                        //this.requestUpdate();
                    });
                break;
            default:
                this.content = "Extension not recognized";
        }
    }

    fileIdObserver() {
        console.log("fileObserver");

    }

    getDefaultConfig() {
        return {
        };
    }

    render() {
        return html`
        <style>
            .section-title {
                border-bottom: 2px solid #eee;
            }
            .label-title {
                text-align: left;
                padding-left: 5px;
                padding-right: 10px;
            }
            
            pre.cmd {
                background: black;
                font-family: "Courier New", monospace;
                padding: 15px;
                color: #a5a5a5;
                font-size: .9em;
                min-height: 150px;
            }            
        </style>
        ${this.file ? html`
            <div class="row" style="padding: 0px 10px">
                <div class="col-md-12">
                    

                    ${this.contentType === "text" ? html`
                        <h3 class="section-title">Head</h3>
                        <pre class="cmd">${this.content}</pre>` : null}
                    ${this.contentType === "image" ? html`
                        <h3 class="section-title">Image</h3>
                        <img class="img-thumbnail" id="thumbnail" />` : null}
                </div>
            </div>
        ` : null }
        `;
    }

}

customElements.define("opencga-file-preview", OpencgaFilePreview);

