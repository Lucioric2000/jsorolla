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


export default class OpencgaJobsView extends LitElement {

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
            jobId: {
                type: String
            },
            job: {
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
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
    }


    firstUpdated(_changedProperties) {
    }

    updated(changedProperties) {
        if (changedProperties.has("jobId")) {
            this.jobIdObserver();
        }
        if (changedProperties.has("job")) {
            this.jobObserver();
        }
        if (changedProperties.has("config")) {
            this.configObserver();
        }
    }

    configObserver() {
    }

    // TODO recheck
    jobIdObserver() {
        console.warn("jobIdObserver");
        if (this.job !== undefined && this.job !== "") {
            const params = {
                study: this.opencgaSession.project.alias + ":" + this.opencgaSession.study.alias,
                includeIndividual: true
            };
            const _this = this;
            this.opencgaSession.opencgaClient.jobs().info(this.job, params)
                .then(function(response) {
                    if (response.response[0].id === undefined) {
                        response.response[0].id = response.response[0].name;
                    }
                    _this.job = response.response[0].result[0];
                    console.log("_this.job", _this.job);
                    _this.requestUpdate();
                })
                .catch(function(reason) {
                    console.error(reason);
                });
        }

    }

    jobObserver() {
        console.log("jobObserver");

    }

    statusFormatter(status) {
        return {
            "PENDING": `<span class="text-primary"><i class="far fa-clock"></i> ${status}</span>`,
            "QUEUED": `<span class="text-primary"><span class=""> <i class="far fa-clock"></i> ${status}</span>`,
            "RUNNING": `<span class="text-primary"><i class="fas fa-sync-alt anim-rotate"></i> ${status}</span>`,
            "DONE": `<span class="text-success"><i class="fas fa-check-circle"></i> ${status}</span>`,
            "ERROR": `<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ${status}</span>`,
            "UNKNOWN": `<span class="text-warning"><i class="fas fa-question-circle"></i> ${status}</span>`,
            "REGISTERING": `<span class="text-info"><i class="far fa-clock"></i> ${status}</span>`,
            "UNREGISTERED": `<span class="text-muted"><i class="far fa-clock"></i> ${status}</span>`,
            "ABORTED": `<span class="text-warning"><i class="fas fa-ban"></i> ${status}</span>`,
            "DELETED": `<span class="text-primary"><i class="fas fa-trash-alt"></i> ${status}</span>`
        }[status];
    }

    renderHTML(html) {
        return document.createRange().createContextualFragment(`${html}`);
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
        </style>

        ${this.job ? html`
            <div class="row" style="padding: 0px 10px">
                <div class="col-md-12">
                    <h3 class="section-title">Summary</h3>

                    <div class="col-md-12">
                        <form class="form-horizontal">
                            <div class="form-group">
                                <label class="col-md-3 label-title">Id</label>
                                <span class="col-md-9">${this.job.id} (${this.job.uuid})</span>
                            </div>
                            <div class="form-group">
                                <label class="col-md-3 label-title">User</label>
                                <span class="col-md-9">${this.job.userId}</span>
                            </div>
                            <div class="form-group">
                                <label class="col-md-3 label-title">Creation Date</label>
                                <span class="col-md-9">${this.job.creationDate}</span>
                            </div>
                            <div class="form-group">
                                <label class="col-md-3 label-title">Priority</label>
                                <span class="col-md-9">${this.job.priority}</span>
                            </div>
                            <div class="form-group">
                                <label class="col-md-3 label-title">Output Dir</label>
                                <span class="col-md-9">${this.job.outDir?.uri || "-"}</span>
                            </div>
                            
                            ${this.job.dependsOn && this.job.dependsOn.length ? html`
                                <div class="form-group">
                                    <label class="col-md-3 label-title">Dependencies</label>
                                    <span class="col-md-9">
                                        <ul>
                                            ${this.job.dependsOn.map( job => html`
                                                <li>${job.id} (${job.uuid}) (${this.renderHTML(this.statusFormatter(job.internal.status.name))})</li>
                                            `) }
                                        </ul>
                                    </span>
                                </div>` : null }
                        </form>
                    </div>
                </div>
            </div>
        ` : null }
        `;
    }

}

customElements.define("opencga-jobs-view", OpencgaJobsView);
