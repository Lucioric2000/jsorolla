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
import "../commons/view/data-form.js";


export default class OpencgaIndividualMendelianErrorsView extends LitElement {

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
            individualId: {
                type: String
            },
            individual: {
                type: Object
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._config = this.getDefaultConfig();
    }

    connectedCallback() {
        super.connectedCallback();

        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    updated(changedProperties) {
        if (changedProperties.has("individualId")) {
            this.individualIdObserver();
        }
        if (changedProperties.has("config")) {
            this._config = {...this.getDefaultConfig(), ...this.config};
        }
    }

    individualIdObserver() {
        if (this.opencgaSession && this.individualId) {
            this.opencgaSession.opencgaClient.individuals().info(this.individualId, {study: this.opencgaSession.study.fqn})
                .then( response => {
                    this.individuals = response.responses[0].results;
                    this.requestUpdate();
                })
                .catch(function(reason) {
                    console.error(reason);
                });
        }
    }

    renderTable() {
        if (this.individual && this.individual.qualityControl?.mendelianErrorReport) {
            let mendelianErrorReport = this.individual.qualityControl.mendelianErrorReport;
            let sampleAggregation = mendelianErrorReport.sampleAggregation.find(sampleAggregation => sampleAggregation.sample === this.individual.id);

            let roles = {};
            roles[this.individual.father?.id] = "FATHER";
            roles[this.individual.mother?.id] = "MOTHER";

            let _cellPadding = "padding: 0px 15px";
            return html`
                <h4>Sample Summary</h4>
                <table class="table table-hover table-no-bordered">
                    <thead>
                        <tr>
                            <th>Sample ID</th>
                            <th>Role</th>
                            <th>Number of Mendelian Errors</th>
                            <th>Rate of Mendelian Errors</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mendelianErrorReport.sampleAggregation.map(sampleAggregation => html`
                            <tr>
                                <td style="${_cellPadding}">
                                    <label>${sampleAggregation.sample}</label>
                                </td>
                                <td style="${_cellPadding}">${roles[sampleAggregation.sample] || "-"}</td>
                                <td style="${_cellPadding}">${sampleAggregation.numErrors}</td>
                                <td style="${_cellPadding}">${sampleAggregation.ratio}</td>
                                <td style="${_cellPadding}">
                                    <span>
                                        ${sampleAggregation.ratio < 0.05
                                            ? html`<i class='fa fa-check' style='color: green'></i>`
                                            : html`<i class='fa fa-times' style='color: red'></i>`
                                        }
                                    </span>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
                
                <!-- Print errors for Individual -->
                <h4 style="padding-top: 15px">Mendelian Errors of ${this.individual.id}</h4>
                <table class="table table-hover table-no-bordered">
                    <thead>
                        <tr>
                            <th>Sample ID</th>
                            <th>Chromosome</th>
                            <th>Error Code</th>
                            <th>Number of Mendelian Errors</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sampleAggregation.chromAggregation.map(chromAggregation => {
                            return Object.keys(chromAggregation.errorCodeAggregation).map(key => html`
                                <tr>
                                    <td style="${_cellPadding}">
                                        <label>${this.individual.id}</label>
                                    </td>
                                    <td style="${_cellPadding}">${chromAggregation.chromosome}</td>
                                    <td style="${_cellPadding}">${key}</td>
                                    <td style="${_cellPadding}">${chromAggregation.errorCodeAggregation[key]}</td>
                                </tr>`)
                            })
                        }
                    </tbody>
                </table>
            `;
        }
    }

    getDefaultConfig() {
        return {
        }
    }

    render() {
        if (!this.individual?.qualityControl?.mendelianErrorReport) {
            return html`<div class="alert alert-info"><i class="fas fa-3x fa-info-circle align-middle"></i> No QC data are available yet.</div>`;
        }

        return html`
            <div>
                <div class="btn-group pull-right">
                    <button type="button" class="btn btn-default ripple btn-sm dropdown-toggle" data-toggle="dropdown"
                            aria-haspopup="true" aria-expanded="false">
                        <i class="fa fa-download" aria-hidden="true"
                           style="padding-right: 5px"></i> Download <span class="caret"></span>
                    </button>
                    <ul class="dropdown-menu btn-sm">
                        ${this._config.download && this._config.download.length ? this._config.download.map(item => html`
                                <li><a href="javascript: void 0" data-download-option="${item}" @click="${this.onDownload}">${item}</a></li>
                        `) : null}
                    </ul>
                </div>
                                
                ${this.renderTable()}
            </div>
        `;
    }

}

customElements.define("opencga-individual-mendelian-errors-view", OpencgaIndividualMendelianErrorsView);
