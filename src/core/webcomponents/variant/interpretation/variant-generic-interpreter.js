/*
 * Copyright 2015-2016 OpenCB
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

import {html, LitElement} from "/web_modules/lit-element.js";
import UtilsNew from "../../../utilsNew.js";
import PolymerUtils from "../../PolymerUtils.js";
import "./variant-interpreter-review.js";
import "./variant-cancer-interpreter-landing.js";
import "./variant-interpreter-qc.js";
import "./variant-interpreter-rd-browser.js";
import "./variant-interpreter-cancer-browser.js";
import "./variant-cancer-interpreter-summary.js";
import "./opencga-variant-interpreter-genome-browser.js";
import "../opencga-variant-filter.js";
import "../../opencga/alignment/opencga-panel-transcript-view.js";
import "../../opencga/opencga-genome-browser.js";
import "../../clinical/opencga-clinical-analysis-view.js";
import "../../clinical/clinical-interpretation-view.js";
import "../../commons/opencga-active-filters.js";
import "../../commons/filters/select-field-filter-autocomplete-simple.js";


class VariantGenericInterpreter extends LitElement {

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
            opencgaSession: {
                type: Object
            },
            clinicalAnalysisId: {
                type: String
            },
            clinicalAnalysis: {
                type: Object
            },
            cellbaseClient: {
                type: Object
            },
            // consequenceTypes: {
            //     type: Object
            // },
            // populationFrequencies: {
            //     type: Object
            // },
            // proteinSubstitutionScores: {
            //     type: Object
            // },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "vgi-" + UtilsNew.randomString(6);

        this.query = {};
        this.search = {};

        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    connectedCallback() {
        super.connectedCallback();
    }

    firstUpdated(_changedProperties) {
        // CellBase version
        // this.cellbaseClient.getMeta("about").then(response => {
        //     if (UtilsNew.isNotUndefinedOrNull(response) && UtilsNew.isNotEmptyArray(response.response)) {
        //         if (UtilsNew.isNotUndefinedOrNull(response.response[0].result) && UtilsNew.isNotEmptyArray(response.response[0].result)) {
        //             this.cellbaseVersion = response.response[0].result[0]["Version: "];
        //         }
        //     }
        // });

        this.requestUpdate();
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession")) {
            this.opencgaSessionObserver();
        }
        if (changedProperties.has("clinicalAnalysisId")) {
            // this.clinicalAnalysisIdObserver();
        }
    }

    opencgaSessionObserver() {
        // With each property change we must updated config and create the columns again. No extra checks are needed.
        this._config = {...this.getDefaultConfig(), ...this.config};

        this.requestUpdate();
    }

    _changeView(e) {
        e.preventDefault(); // prevents the hash change to "#" and allows to manipulate the hash fragment as needed

        $(".clinical-portal-content").hide(); // hides all content divs
        if (typeof e.target !== "undefined" && typeof e.target.dataset.view !== "undefined") {
            // $("#" + this._prefix + e.target.dataset.view).show(); // get the href and use it find which div to show
            PolymerUtils.show(this._prefix + e.target.dataset.view);
        }

        // Show the active button
        // $(".clinical-portal-button").removeClass("active");
        $(".clinical-portal-button").removeClass("active");
        // $(e.target).addClass("active");
        $(e.target).addClass("active");
    }

    onClinicalAnalysisUpdate (e) {
        this.clinicalAnalysis = {...e.detail.clinicalAnalysis};
        this.requestUpdate();
    }

    onClinicalAnalysis(e) {
        this.clinicalAnalysis = e.detail.clinicalAnalysis;
        // this.clinicalAnalysis.type = "cancer";
        this.requestUpdate();
    }

    getDefaultConfig() {
        return {
            title: "Variant Generic Interpreter",
            icon: "fas fa-search",
            active: false,
            tools: [
                {
                    id: "select",
                    title: "Case Info",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "qc",
                    title: "Quality Control",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "genome-browser",
                    title: "Genome Browser",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "interpretation",
                    title: "Interpretation Methods",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "variant-browser",
                    title: "Variant Browser",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "review",
                    title: "Review",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                },
                {
                    id: "report",
                    title: "Report",
                    acronym: "VB",
                    description: "",
                    icon: "fa fa-list"
                }
            ]
        };
    }

    render() {
        // Check Project exists
        // if (!this.opencgaSession && !this.opencgaSession.project) {
        //     return html`
        //         <div class="guard-page">
        //             <i class="fas fa-lock fa-5x"></i>
        //             <h3>No project available to browse. Please login to continue</h3>
        //         </div>
        //     `;
        // }

        return html`
            <style>
                
                ul.wizard {
                    display: flex;
                    justify-content: space-around;
                    list-style: none;
                }
                
                li.wizard-item {
                    cursor: pointer;
                    margin: 15px 30px;
                    width: 110px;
                    height: 110px;
                    border-radius: 50%;
                    text-align: center;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: white;
                    z-index: 10;
                }
                li.wizard-item.active {
                    font-size: 1.1em;
                    background: #f1f1f1;
                }
                
                li.wizard-item:before {
                    content: "";
                    position: absolute;
                    height: 3px;
                    background: #000966;
                    width: 100%;
                    top: 50%;
                    left: 110px;
                    z-index: 5;
                }
                
                li.wizard-item:last-child:before {
                    background: transparent;
                }
                
                li.wizard-item:hover:after {
                    -webkit-transform: scale(0.85);
                    -moz-transform: scale(0.85);
                    -ms-transform: scale(0.85);
                    transform: scale(0.85);
                    opacity: 0.5;
                }
                
                li.wizard-item:after  {
                    content: "";
                    top: 0;
                    left: 0;
                    padding: 0;
                    width: 110px;
                    height: 110px;
                    border-radius: 50%;
                    position: absolute;
                    box-shadow: 0 0 0 4px #000966;
                    -webkit-transition: -webkit-transform 0.2s, opacity 0.2s;
                    -moz-transition: -moz-transform 0.2s, opacity 0.2s;
                    transition: transform 0.2s, opacity 0.2s;
                }
            </style>
            
            <div class="row">
       
                <div class="page-title">
                    <h2>
                        ${this.clinicalAnalysis && this.clinicalAnalysis.id ? html`
                            <i class="fa fa-filter" aria-hidden="true" style="padding-left: 10px;padding-right: 10px"></i>&nbsp;${this._config.title} - Case ${this.clinicalAnalysis.id}
                        ` : html`
                            <i class="fa fa-filter" aria-hidden="true"></i>&nbsp; ${this._config.title}
                        `}
                    </h2>
                </div>
            
                <div class="col-md-10 col-md-offset-1">
                    <nav class="navbar" style="margin-bottom: 5px; border-radius: 0px">
                        <div class="container-fluid">
                            <!-- Brand and toggle get grouped for better mobile display -->
                            <div class="navbar-header">
                                <!--
                                    <a class="navbar-brand" href="#home" @click="${this.changeTool}">
                                        <b>${this._config.title} <sup>${this._config.version}</sup></b>
                                    </a>
                                 -->
                            </div>
                            <div class="collapse navbar-collapse" style="padding: 0px 20px">
                                <!-- Controls aligned to the LEFT -->
                                <ul class="wizard">
                                    ${this._config.tools && this._config.tools.map(item => html`
                                        <li class="wizard-item clinical-portal-button ${!this.clinicalAnalysis && item.id !== "select" ? "disabled" : ""}" data-view="${item.id}" @click="${this._changeView}">
                                            ${item.title}
                                        </li>
                                    `)}
                                </ul>
                            </div> 
                        </div> 
                    </nav> 
                </div>
                
                <div id="${this._prefix}MainWindow" class="col-md-12">
                    <div style="padding: 10px 10px">
                    
                        ${this._config.tools ? html`
                            <div id="${this._prefix}select" class="clinical-portal-content col-md-10 col-md-offset-1">
                                <variant-cancer-interpreter-landing .opencgaSession="${this.opencgaSession}"
                                                                    .config="${this._config}"
                                                                    @selectclinicalnalysis="${this.onClinicalAnalysis}">
                                </variant-cancer-interpreter-landing>
                            </div>
                        ` : null}
        
                        ${this._config.tools ? html`
                            <div id="${this._prefix}qc" class="clinical-portal-content col-md-10 col-md-offset-1" 
                                        style="${this._config.tools[0].id !== "qc" ? "display: none" : ""}">
                                <variant-interpreter-qc .opencgaSession="${this.opencgaSession}"
                                                        .clinicalAnalysis="${this.clinicalAnalysis}"
                                                        .config="${this._config}">
                                </variant-interpreter-qc>
                            </div>
                        ` : null}
                        
                        ${this._config.tools ? html`
                            <div id="${this._prefix}genome-browser" class="clinical-portal-content" style="${this._config.tools[0].id !== "genome-browser" ? "display: none" : ""}">
                                <opencga-variant-interpreter-genome-browser .opencgaSession="${this.opencgaSession}"
                                                                            .cellbaseClient="${this.cellbaseClient}"
                                                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                                                            .config="${this._config}">
                                </opencga-variant-interpreter-genome-browser>
                                <!--
                                <opencga-variant-interpreter-genome-browser .opencgaSession="${this.opencgaSession}"
                                                                            .cellbaseClient="${this.cellbaseClient}"
                                                                            .samples="${this.samples}"
                                                                            .query="${this.query}"
                                                                            .search="${this.search}"
                                                                            .region="${this.search.region}"
                                                                            .geneIds="${this.geneIds}"
                                                                            .panelIds="${this.diseasePanelIds}"
                                                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                                                            .active="${this._genomeBrowserActive}"
                                                                            .fullScreen="${this.fullScreen}"
                                                                            .config="${this._config.genomeBrowser}">
                                </opencga-variant-interpreter-genome-browser>
                                -->
                            </div>
                        ` : null}
                        
                        ${this._config.tools ? html`
                            <div id="${this._prefix}variant-browser" class="clinical-portal-content" style="${this._config.tools[0].id !== "variant-browser" ? "display: none" : ""}">
                                
                                ${this.clinicalAnalysis && this.clinicalAnalysis.type.toUpperCase() === "FAMILY" 
                                    ? html`
                                        <variant-interpreter-rd-browser .opencgaSession="${this.opencgaSession}"
                                                                        .clinicalAnalysis="${this.clinicalAnalysis}"
                                                                        .query="${this.interpretationSearchQuery}"
                                                                        .cellbaseClient="${this.cellbaseClient}"
                                                                        .populationFrequencies="${this._config.populationFrequencies}"
                                                                        .proteinSubstitutionScores="${this._config.proteinSubstitutionScores}"
                                                                        .consequenceTypes="${this._config.consequenceTypes}"
                                                                        @clinicalAnalysisUpdate="${this.onClinicalAnalysisUpdate}"
                                                                        @gene="${this.geneSelected}"
                                                                        @samplechange="${this.onSampleChange}">
                                        </variant-interpreter-rd-browser>`
                                    : html `
                                        <variant-interpreter-cancer-browser .opencgaSession="${this.opencgaSession}"
                                                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                                                            .query="${this.interpretationSearchQuery}"
                                                                            .cellbaseClient="${this.cellbaseClient}"
                                                                            .populationFrequencies="${this._config.populationFrequencies}"
                                                                            .proteinSubstitutionScores="${this._config.proteinSubstitutionScores}"
                                                                            .consequenceTypes="${this._config.consequenceTypes}"
                                                                            @clinicalAnalysisUpdate="${this.onClinicalAnalysisUpdate}"
                                                                            @gene="${this.geneSelected}">
                                        </variant-interpreter-cancer-browser>`
                                }
                            </div>
                        ` : null}
                    
                        ${this._config.tools ? html`
                            <div id="${this._prefix}review" class="clinical-portal-content col-md-10 col-md-offset-1" style="${this._config.tools[0].id !== "review" ? "display: none" : ""}">
                                <variant-interpreter-review .opencgaSession="${this.opencgaSession}"
                                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                                            .cellbaseClient="${this.cellbaseClient}"
                                                            .populationFrequencies="${this._config.populationFrequencies}"
                                                            .proteinSubstitutionScores="${this._config.proteinSubstitutionScores}"
                                                            .consequenceTypes="${this._config.consequenceTypes}"
                                                            .config="${this._config}"
                                                            @gene="${this.geneSelected}"
                                                            @samplechange="${this.onSampleChange}">
                                 </variant-interpreter-review>
                            </div>
                        ` : null}
                    </div>
                </div>
            </div> 
        `;

        // if (!this.clinicalAnalysis) {
        //     return html`
        //         <variant-cancer-interpreter-landing .opencgaSession="${this.opencgaSession}"
        //                                             .config="${this.config}"
        //                                             @selectclinicalnalysis="${this.onClinicalAnalysis}">
        //         </variant-cancer-interpreter-landing>
        //     `;
        // }
    }

}

customElements.define("variant-generic-interpreter", VariantGenericInterpreter);
