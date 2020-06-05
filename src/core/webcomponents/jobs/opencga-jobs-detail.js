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
import "./opencga-jobs-detail-log.js";
import "./opencga-jobs-view.js";
import "./../commons/view/detail-tabs.js";

export default class OpencgaJobsDetail extends LitElement {

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
            jobId: {
                type: Object
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
        this._prefix = "sf-" + UtilsNew.randomString(6);
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    updated(changedProperties) {
        if (changedProperties.has("jobId")) {
            this.jobIdObserver();
        }

        if (changedProperties.has("config")) {
            this._config = {...this.getDefaultConfig(), ...this.config};
            this.requestUpdate();
        }
    }

    jobIdObserver() {
        if (this.opencgaSession && this.jobId) {
            this.opencgaSession.opencgaClient.jobs().info(this.jobId, {study: this.opencgaSession.study.fqn})
                .then(response => {
                    this.job = response.getResult(0);
                })
                .catch(function(reason) {
                    console.error(reason);
                });
        }
    }

    getDefaultConfig() {
        return {
            title: "Job",
            showTitle: true,
            items: [
                {
                    id: "job-view",
                    name: "Summary",
                    active: true,
                    // visible:
                    render: (job, active, opencgaSession) => {
                        return html`<opencga-jobs-view .opencgaSession=${opencgaSession} .job="${job}"></opencga-jobs-view>`;
                    }
                },
                {
                    id: "job-log",
                    name: "Logs",
                    // visible:
                    render: (job, active, opencgaSession) => {
                        return html`
                            <opencga-jobs-detail-log .opencgaSession=${opencgaSession}
                                                    .active="${active}"
                                                    .job="${job}">
                            </opencga-jobs-detail-log>
                        `;
                    }
                }
            ]
        }
    }

    render() {
        return this.job ? html`
            <detail-tabs .config="${this._config.detail}" .data="${this.job}" .opencgaSession="${this.opencgaSession}"></detail-tabs>
        ` : null;
    }

}

customElements.define("opencga-jobs-detail", OpencgaJobsDetail);
