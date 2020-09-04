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

import {LitElement, html} from "/web_modules/lit-element.js";
import ClinicalAnalysisUtils from "../../clinical/clinical-analysis-utils.js";
import UtilsNew from "../../../utilsNew.js";
import PolymerUtils from "../../PolymerUtils.js";
import "../../tool-header.js";
import "./variant-interpreter-grid.js";
import "./variant-interpreter-detail.js";
import "../opencga-variant-filter.js";
import "../../commons/opencga-active-filters.js";
import "../../commons/filters/sample-genotype-filter.js";
import "../../commons/filters/caveman-caller-filter.js";
import "../../commons/filters/strelka-caller-filter.js";
import "../../commons/filters/pindel-caller-filter.js";
import "../../commons/filters/ascat-caller-filter.js";
import "../../commons/filters/canvas-caller-filter.js";
import "../../commons/filters/brass-caller-filter.js";
import "../../commons/filters/manta-caller-filter.js";

class VariantInterpreterBrowserCancer extends LitElement {

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
            query: {
                type: Object
            },
            cellbaseClient: {
                type: Object
            },
            consequenceTypes: {
                type: Object
            },
            populationFrequencies: {
                type: Object
            },
            proteinSubstitutionScores: {
                type: Object
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "vicb-" + UtilsNew.randomString(6);

        this.diseasePanelIds = [];

        this.interactive = true;

        this.messageError = false;
        this.messageSuccess = false;

        this.samples = [];

        this.variant = null;
        this.reportedVariants = [];

        this.query = {};

        this.predefinedFilter = false; // flag that hides the warning message in active-filter for predefined samples value

        this.notSavedVariantIds = 0;
        this.removedVariantIds = 0;
        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    connectedCallback() {
        super.connectedCallback();
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") || changedProperties.has("config")) {
            this._config = {...this.getDefaultConfig(), ...this.config};
            this.requestUpdate();
        }

        if (changedProperties.has("clinicalAnalysis")) {
            this.updateActiveFilterFilters();
        }

        if (changedProperties.has("clinicalAnalysisId")) {
            this.clinicalAnalysisIdObserver();
        }

        if (changedProperties.has("query")) {
            this.queryObserver();
        }
    }

    queryObserver() {
        // Query passed is executed and set to variant-filter, active-filters and variant-grid components
        // if (UtilsNew.isNotUndefinedOrNull(this.query)) {
        //     this.preparedQuery = this.query;
        //     this.executedQuery = this.query;
        // }
        if (this.opencgaSession) {
            if (this.query) {
                this.preparedQuery = {study: this.opencgaSession.study.fqn, ...this.query};
                this.executedQuery = {study: this.opencgaSession.study.fqn, ...this.query};
            } else {
                this.preparedQuery = {study: this.opencgaSession.study.fqn, sample: this.predefinedFilter};
                this.executedQuery = {study: this.opencgaSession.study.fqn, sample: this.predefinedFilter};
            }
        }
        this.requestUpdate();
    }

    /**
     * Fetch the CinicalAnalysis object from REST and trigger the observer call.
     */
    clinicalAnalysisIdObserver() {
        if (this.opencgaSession && this.clinicalAnalysisId) {
            this.opencgaSession.opencgaClient.clinical().info(this.clinicalAnalysisId, {study: this.opencgaSession.study.fqn})
                .then(response => {
                    this.clinicalAnalysis = response.responses[0].results[0];
                    this.updateActiveFilterFilters();
                    this.requestUpdate();
                })
                .catch(response => {
                    console.error("An error occurred fetching clinicalAnalysis: ", response);
                });
        }
    }

    updateActiveFilterFilters() {
        this.somaticSample = this.clinicalAnalysis.proband.samples.find(sample => sample.somatic);

        if (!this.query?.sample) {
            let sampleIds = this.clinicalAnalysis.proband.samples.map(sample => sample.id).join(",");
            this.query = {
                ...this.query,
                sample: this.somaticSample.id,
                includeSample: sampleIds
            }
            this.predefinedFilter = {...this.query};
        }

        this.callerToFile = {};
        this.opencgaSession.opencgaClient.files().search({samples: this.somaticSample.id, study: this.opencgaSession.study.fqn})
            .then(fileResponse => {
                this.files = fileResponse.response[0].results;
                // Prepare a map from caller to File
                this.callerToFile = {};
                for (let file of this.files) {
                    if (file.software?.name) {
                        let softwareName = file.software.name.toLowerCase();
                        this.callerToFile[softwareName] = file;
                    }
                }
                this._config = {...this.getDefaultConfig(), ...this.config};
            })
            .catch(response => {
                console.error("An error occurred fetching sample: ", response);
            });


        let sampleQc = ClinicalAnalysisUtils.getProbandSampleQc(this.clinicalAnalysis);
        let _activeFilterFilters = [];
        if (sampleQc?.metrics?.length > 0) {
            let variantStats = sampleQc.metrics[0].variantStats;
            if (variantStats && variantStats.length > 0) {
                _activeFilterFilters = variantStats.map(variantStat => ({id: variantStat.id, query: variantStat.query}))
            }
        }

        // this.activeFilterFilters = _activeFilterFilters && _activeFilterFilters.length > 0 ? _activeFilterFilters : this._config.filter.examples;
        // If WC variant stats filters are found we add them to active filters, we do not replace them.
        if (_activeFilterFilters.length > 0) {
            // Concat QC filters to examples
            if (this._config?.filter?.examples && this._config.filter.examples.length > 0) {
                _activeFilterFilters.push({separator: true});
                _activeFilterFilters.push(...this._config.filter.examples);
            }
            this.activeFilterFilters = _activeFilterFilters;
        } else {
            this.activeFilterFilters = this._config.filter.examples;
        }

        if (this.clinicalAnalysis?.interpretation?.primaryFindings?.length) {
            this.savedVariants = this.clinicalAnalysis?.interpretation?.primaryFindings?.map(v => v.id);
        }
    }

    onSelectVariant(e) {
        this.variantId = e.detail.id;
        this.variant = e.detail.row;

        this.requestUpdate();
    }

    onCheckVariant(e) {
        if (!this.clinicalAnalysis) {
            console.error("It is not possible have this error");
            return;
        }

        this.clinicalAnalysis.modificationDate = e.detail.timestamp;
        this.clinicalAnalysis.interpretation = {
            attributes: {
                modificationDate: e.detail.timestamp
            }
        };

        this.clinicalAnalysis.interpretation.primaryFindings = Array.from(e.detail.rows);

        this.currentSelection = e.detail?.rows?.map(v => v.id) ?? [];

        //the following counters keep track of the current variant selection compared to the one saved on the server
        this.notSavedVariantIds = this.currentSelection.filter(v => !~this.savedVariants.indexOf(v)).length;
        this.removedVariantIds = this.savedVariants.filter(v => !~this.currentSelection.indexOf(v)).length;
        this.requestUpdate();
    }

    onViewVariants(e) {
        let variantIds = this.clinicalAnalysis.interpretation.primaryFindings.map(e => e.id);
        this.preparedQuery = {...this.preparedQuery, id: variantIds.join(",")};
        this.executedQuery = {...this.executedQuery, id: variantIds.join(",")};
        this.requestUpdate();
    }

    onResetVariants(e) {
        let alreadySaved = this.clinicalAnalysis.interpretation.primaryFindings.filter(e => e.attributes.creationDate);
        // debugger
        this.clinicalAnalysis.interpretation.primaryFindings = alreadySaved;
        console.error("primaryFindings", this.clinicalAnalysis.interpretation.primaryFindings);
        this.clinicalAnalysis = {...this.clinicalAnalysis};
        this.requestUpdate();
    }

    onSaveVariants(e) {
        let f = clinicalAnalysis => this.dispatchEvent(new CustomEvent("clinicalAnalysisUpdate", {
            detail: {
                clinicalAnalysis: clinicalAnalysis
            },
            bubbles: true,
            composed: true
        }));
        ClinicalAnalysisUtils.updateInterpretatoin(this.clinicalAnalysis, this.opencgaSession, f);
    }

    onSampleChange(e) {
        const _samples = e.detail.samples;
        this.samples = _samples.slice();
        this.dispatchEvent(new CustomEvent("samplechange", {detail: e.detail, bubbles: true, composed: true}));
        // this._initGenotypeSamples(this.samples);
    }

    onChangeView(e) {
        e.preventDefault();
        const view = e.target.dataset.view;
        if (view) {
            // Hide all views and show the requested one
            PolymerUtils.hideByClass("variant-interpretation-content");
            PolymerUtils.show(this._prefix + view);

            // Show the active button
            // $(e.target).addClass("active");
            PolymerUtils.removeClass(".variant-interpretation-view-buttons", "active");
            PolymerUtils.addClass(this._prefix + view + "Button", "active");
        }
    }

    onVariantFilterChange(e) {
        this.preparedQuery = e.detail.query;
        // TODO quick fix to avoid warning message on sample
        if (!this.predefinedFilter) {
            this.executedQuery = e.detail.query;
            this.predefinedFilter = e.detail.query;
        }
        this.requestUpdate();
    }

    onVariantFilterSearch(e) {
        this.preparedQuery = e.detail.query;
        // this.executedQuery = {...this.preparedQuery};
        this.executedQuery = e.detail.query;
        this.requestUpdate();
    }


    onActiveFilterChange(e) {
        this.query = {...this.predefinedFilter, ...e.detail}; // we add this.predefinedFilter in case sample field is not present
        this.preparedQuery = {...e.detail};
        this.requestUpdate();
    }

    onActiveFilterClear() {
        this.query = {study: this.opencgaSession.study.fqn, ...this.predefinedFilter};
        this.preparedQuery = {...this.query};
        this.requestUpdate();
    }

    onVariantCallerFilterChange(filter, query) {
        debugger
        if (query.fileData) {
            let [fileId, fileFilter] = filter.split(":");
            let files = query.fileData.split(",");
            let fileIndex = files.findIndex(e => e.startsWith(fileId));
            if (fileIndex >= 0) {
                if (fileFilter) {
                    files[fileIndex] = filter;
                } else {
                    files.splice(fileIndex, 1);
                }
            } else {
                if (fileFilter) {
                    files.push(filter);
                }
            }
            return files.join(",");
        } else {
            return filter;
        }
        // this.requestUpdate();
    }

    getDefaultConfig() {
        return {
            title: "Cancer Case Interpreter",
            icon: "fas fa-search",
            active: false,
            showOtherTools: false,
            showTitle: false,
            searchButtonText: "Search",
            filter: {
                title: "Filter",
                activeFilters: {
                    alias: {
                        // Example:
                        // "region": "Region",
                        // "gene": "Gene",
                        "ct": "Consequence Types",
                    },
                    complexFields: ["sample", "fileData"],
                    hiddenFields: [],
                    lockedFields: [{id: "sample"}]
                },
                sections: [     // sections and subsections, structure and order is respected
                    {
                        title: "Sample And File",
                        collapsed: false,
                        fields: [
                            {
                                id: "sample-genotype",
                                title: "Sample Genotype",
                                render: (eventHandler, query) => html`
                                    <div>Genotype filter for <span style="font-style: italic; word-break: break-all">${this.somaticSample?.id}</span></div>
                                    <sample-genotype-filter .sample="${this.somaticSample}" @filterChange="${eventHandler}"></sample-genotype-filter>`,
                            },
                            // {
                            //     id: "caveman-caller",
                            //     title: "Caveman Caller",
                            //     render: (eventHandler, preparedQuery, opencgaSession) => html`
                            //         <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["caveman"].name}</span></div>
                            //         <caveman-caller-filter .query="${{FILTER: "PASS"}}" @filterChange="${e => this.onVariantCallerFilterChange("caveman", eventHandler, e)}"></caveman-caller-filter>`,
                            //     visible: () => this.callerToFile && this.callerToFile["caveman"]
                            // },
                            {
                                id: "caveman-caller",
                                title: "Caveman Caller",
                                description: () => html`File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["caveman"].name}</span>`,
                                fileId: `${this.callerToFile ? this.callerToFile["caveman"].name : null}`,
                                visible: () => this.callerToFile && this.callerToFile["caveman"],
                                callback: (filter, query) => this.onVariantCallerFilterChange(filter, query)
                            },
                            {
                                id: "strelka-caller",
                                title: "Strelka Caller",
                                render: (eventHandler, query) => html`
                                    <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["strelka"].name}</span></div>
                                    <strelka-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("strelka", e)}"></strelka-caller-filter>`,
                                visible: () => this.callerToFile && this.callerToFile["strelka"]
                            },
                            // {
                            //     id: "strelka-caller",
                            //     title: "Strelka Caller",
                            //     description: () => html`File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["strelka"].name}</span>`,
                            //     fileId: `${this.callerToFile ? this.callerToFile["strelka"].name : null}`,
                            //     visible: () => this.callerToFile && this.callerToFile["strelka"],
                            //     callback: (filter, query) => this.onVariantCallerFilterChange(filter, query)
                            // },
                            // {
                            //     id: "pindel-caller",
                            //     title: "Pindel Caller",
                            //     render: (eventHandler, query) => html`
                            //         <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["pindel"].name}</span></div>
                            //         <pindel-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("pindel", e)}"></pindel-caller-filter>`,
                            //     visible: () => this.callerToFile && this.callerToFile["pindel"]
                            // },
                            {
                                id: "pindel-caller",
                                title: "Pindel Caller",
                                description: () => html`File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["pindel"].name}</span>`,
                                fileId: `${this.callerToFile ? this.callerToFile["pindel"].name : null}`,
                                visible: () => this.callerToFile && this.callerToFile["pindel"],
                                callback: (filter, query) => this.onVariantCallerFilterChange(filter, query)
                            },
                            {
                                id: "ascat-caller",
                                title: "Ascat Caller",
                                render: (eventHandler, query) => html`
                                    <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["ascat"].name}</span></div>
                                    <ascat-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("ascat", e)}"></ascat-caller-filter>`,
                                visible: () => this.callerToFile && this.callerToFile["ascat"]
                            },
                            {
                                id: "canvas-caller",
                                title: "Canvas Caller",
                                render: (eventHandler, query) => html`
                                    <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["canvas"].name}</span></div>
                                    <canvas-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("canvas", e)}"></canvas-caller-filter>`,
                                visible:() => this.callerToFile && this.callerToFile["canvas"]
                            },
                            {
                                id: "brass-caller",
                                title: "Brass Caller",
                                render: (eventHandler, query) => html`
                                    <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["brass"].name}</span></div>
                                    <brass-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("brass", e)}"></brass-caller-filter>`,
                                visible: () => this.callerToFile && this.callerToFile["brass"]
                            },
                            {
                                id: "manta-caller",
                                title: "Manta Caller",
                                render: (eventHandler, query) => html`
                                    <div>File filters for <span style="font-style: italic; word-break: break-all">${this.callerToFile["manta"].name}</span></div>
                                    <manta-caller-filter @filterChange="${e => this.onVariantCallerFilterChange("manta", e)}"></manta-caller-filter>`,
                                visible: () => this.callerToFile && this.callerToFile["manta"]
                            },
                        ]
                    },
                    {
                        title: "Genomic",
                        collapsed: true,
                        fields: [
                            {
                                id: "region",
                                title: "Genomic Location",
                                tooltip: tooltips.region,
                            },
                            {
                                id: "feature",
                                title: "Feature IDs (gene, SNPs, ...)",
                                tooltip: tooltips.feature,
                            },
                            {
                                id: "diseasePanels",
                                title: "Disease Panels",
                                tooltip: tooltips.diseasePanels
                            },
                            {
                                id: "biotype",
                                title: "Gene Biotype",
                                biotypes: biotypes,
                                tooltip: tooltips.biotype
                            },
                            {
                                id: "type",
                                title: "Variant Type",
                                types: ["SNV", "INDEL", "CNV", "INSERTION", "DELETION"],
                                tooltip: tooltips.type
                            }
                        ]
                    },
                    {
                        title: "Consequence Type",
                        collapsed: true,
                        fields: [
                            // {
                            //     id: "consequenceType",
                            //     title: "Select SO terms",
                            //     tooltip: "Filter out variants falling outside the genomic features (gene, transcript, SNP, etc.) defined"
                            // },
                            {
                                id: "consequenceTypeSelect",
                                title: "Select SO terms",
                                tooltip: tooltips.consequenceTypeSelect
                            }
                        ]
                    },
                    // {
                    //     title: "Population Frequency",
                    //     collapsed: true,
                    //     fields: [
                    //         {
                    //             id: "populationFrequency",
                    //             title: "Select Population Frequency",
                    //             tooltip: tooltips.populationFrequencies,
                    //             showSetAll: true
                    //         }
                    //     ]
                    // },
                    {
                        title: "Phenotype-Disease",
                        collapsed: true,
                        fields: [

                            {
                                id: "go",
                                title: "GO Accessions (max. 100 terms)",
                                tooltip: tooltips.go
                            },
                            {
                                id: "hpo",
                                title: "HPO Accessions",
                                tooltip: tooltips.hpo
                            },
                            {
                                id: "clinvar",
                                title: "ClinVar Accessions",
                                tooltip: tooltips.clinvar
                            },
                            // {
                            //     id: "fullTextSearch",
                            //     title: "Full-text search on HPO, ClinVar, protein domains or keywords. Some OMIM and Orphanet IDs are also supported",
                            //     tooltip: tooltips.fullTextSearch
                            // }
                        ]
                    },
                    {
                        title: "Deleteriousness",
                        collapsed: true,
                        fields: [
                            {
                                id: "proteinSubstitutionScore",
                                title: "Protein Substitution Score",
                                tooltip: tooltips.proteinSubstitutionScore
                            },
                            {
                                id: "cadd",
                                title: "CADD",
                                tooltip: tooltips.cadd
                            }
                        ]
                    },
                    {
                        title: "Conservation",
                        collapsed: true,
                        fields: [
                            {
                                id: "conservation",
                                title: "Conservation Score",
                                tooltip: tooltips.conservation
                            }
                        ]
                    },
                ],
                examples: [
                    {
                        id: "Example BRCA2",
                        active: false,
                        query: {
                            gene: "BRCA2",
                            conservation: "phylop<0.001"
                        }
                    },
                    {
                        id: "Full Example",
                        query: {
                            "xref": "BRCA1,TP53",
                            "biotype": "protein_coding",
                            "type": "SNV,INDEL",
                            "ct": "lof",
                            "populationFrequencyAlt": "GNOMAD_GENOMES:ALL<0.1",
                            "protein_substitution": "sift>5,polyphen>4",
                            "conservation": "phylop>1;phastCons>2;gerp<=3"
                        }
                    }
                ],
                result: {
                    grid: {
                        pagination: true,
                        pageSize: 10,
                        pageList: [10, 25, 50],
                        showExport: false,
                        detailView: true,
                        showReview: false,
                        showActions: false,
                        showSelectCheckbox: true,
                        multiSelection: false,
                        nucleotideGenotype: true,
                        alleleStringLengthMax: 10,
                        header: {
                            horizontalAlign: "center",
                            verticalAlign: "bottom"
                        },

                        quality: {
                            qual: 30,
                            dp: 20
                        },
                        // populationFrequencies: ["1kG_phase3:ALL", "GNOMAD_GENOMES:ALL", "GNOMAD_EXOMES:ALL", "UK10K:ALL", "GONL:ALL", "ESP6500:ALL", "EXAC:ALL"]
                    }
                },
                detail: {
                    title: "Selected Variant",
                    views: [
                        {
                            id: "annotationSummary",
                            title: "Summary",
                            active: true
                        },
                        {
                            id: "annotationConsType",
                            title: "Consequence Type",
                        },
                        {
                            id: "annotationPropFreq",
                            title: "Population Frequencies"
                        },
                        {
                            id: "annotationClinical",
                            title: "Clinical"
                        },
                        {
                            id: "fileMetrics",
                            title: "File Metrics"
                        },
                        {
                            id: "cohortStats",
                            title: "Cohort Stats",
                            cohorts: this.cohorts
                        },
                        {
                            id: "beacon",
                            title: "Beacon"
                        }
                    ]
                }
            },
            aggregation: {
            }
        };
    }

    render() {
        // Check Project exists
        if (!this.opencgaSession || !this.opencgaSession.project) {
            return html`
                <div class="guard-page">
                    <i class="fas fa-lock fa-5x"></i>
                    <h3>No project available to browse. Please login to continue</h3>
                </div>
            `;
        }

        // if (!this.clinicalAnalysis) {
        //     return html`
        //         <variant-cancer-interpreter-landing .opencgaSession="${this.opencgaSession}"
        //                                             .config="${this.config}"
        //                                             @selectClinicalAnalysis="${this.onClinicalAnalysis}">
        //         </variant-cancer-interpreter-landing>
        //     `;
        // }

        return html`
            <style>
                .prioritization-center {
                    margin: auto;
                    text-align: justify;
                    width: 95%;
                }
    
                .browser-variant-tab-title {
                    font-size: 115%;
                    font-weight: bold;
                }
    
                .prioritization-variant-tab-title {
                    font-size: 115%;
                    font-weight: bold;
                }
   
                .form-section-title {
                    padding: 5px 0px;
                    width: 95%;
                    border-bottom-width: 1px;
                    border-bottom-style: solid;
                    border-bottom-color: #ddd
                }
                
                #clinicalAnalysisIdText {
                    padding: 10px;
                }
                
                .clinical-analysis-id-wrapper {
                    padding: 20px;
                }
                
                .clinical-analysis-id-wrapper .text-filter-wrapper {
                    margin: 20px 0;
                }
            </style>

            ${this._config.showTitle ? html`
                <tool-header title="${this.clinicalAnalysis ? `${this._config.title} (${this.clinicalAnalysis.id})` : this._config.title}" icon="${this._config.icon}"></tool-header>
            ` : null}

            <div class="row">
                <div class="col-md-2">
                    <opencga-variant-filter .opencgaSession="${this.opencgaSession}"
                                            .query="${this.query}"
                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                            .cellbaseClient="${this.cellbaseClient}"
                                            .populationFrequencies="${this.populationFrequencies}"
                                            .consequenceTypes="${this.consequenceTypes}"
                                            .config="${this._config.filter}"
                                            @queryChange="${this.onVariantFilterChange}"
                                            @querySearch="${this.onVariantFilterSearch}"
                                            @samplechange="${this.onSampleChange}">
                    </opencga-variant-filter>
                </div> <!-- Close col-md-2 -->
                
                <div class="col-md-10">
                    <div>
                        <div class="btn-toolbar" role="toolbar" aria-label="toolbar" style="margin-bottom: 20px">
                            <div class="pull-right" role="group">
                                <button type="button" class="btn btn-default ripple" @click="${this.onViewVariants}" title="This shows saved variants">
                                    <i class="fas fa-eye icon-padding" aria-hidden="true"></i> View
                                </button>
                                <button type="button" class="btn btn-default ripple" @click="${this.onResetVariants}" title="This removes not saved variants">
                                    <i class="fas fa-eraser icon-padding" aria-hidden="true"></i> Reset
                                </button>
                                <button type="button" class="btn btn-default ripple" @click="${this.onSaveVariants}" title="Save variants in the server">
                                    <i class="fas fa-save icon-padding" aria-hidden="true"></i> Save
                                </button>
                            </div>
                        </div>
                        ${this.notSavedVariantIds || this.removedVariantIds
                            ? html`
                                <div class="alert alert-warning" role="alert" id="${this._prefix}SaveWarning">
                                    <span><strong>Warning!</strong></span>&nbsp;&nbsp;Primary findings have changed:
                                    ${this.notSavedVariantIds ? html`${this.notSavedVariantIds} variant${this.notSavedVariantIds > 1 ? "s have" : " has"} been added` : null}${this.removedVariantIds ? html`${this.notSavedVariantIds ? " and " : null}${this.removedVariantIds} variant${this.removedVariantIds > 1 ? "s have" : " has"} been removed` : null}. Please click on <strong> Save </strong> to make the results persistent.
                                </div>`
                            : null
                        }
                    </div>
                
                    <div id="${this._prefix}MainContent">
                        <div id="${this._prefix}ActiveFilters">
                            <opencga-active-filters resource="VARIANT"
                                                    .opencgaSession="${this.opencgaSession}"
                                                    .clinicalAnalysis="${this.clinicalAnalysis}"
                                                    .defaultStudy="${this.opencgaSession.study.fqn}"
                                                    .query="${this.preparedQuery}"
                                                    .refresh="${this.executedQuery}"
                                                    .filters="${this.activeFilterFilters}"
                                                    .alias="${this._config.activeFilterAlias}"
                                                    .config="${this._config.filter.activeFilters}"
                                                    @activeFilterChange="${this.onActiveFilterChange}"
                                                    @activeFilterClear="${this.onActiveFilterClear}">
                            </opencga-active-filters>
                        </div>
                        
                        <div class="main-view">
                            <div id="${this._prefix}TableResult" class="variant-interpretation-content active">
                                <variant-interpreter-grid .opencgaSession="${this.opencgaSession}"
                                                          .clinicalAnalysis="${this.clinicalAnalysis}"
                                                          .query="${this.executedQuery}"
                                                          .consequenceTypes="${consequenceTypes}"
                                                          .populationFrequencies="${populationFrequencies}"
                                                          .proteinSubstitutionScores="${this.proteinSubstitutionScores}"
                                                          .config="${this._config.filter.result.grid}"
                                                          @selected="${this.onSelectedGene}"
                                                          @selectrow="${this.onSelectVariant}"
                                                          @checkrow="${this.onCheckVariant}">
                                </variant-interpreter-grid>
                
                                <!-- Bottom tabs with detailed variant information -->
                                <variant-interpreter-detail .opencgaSession="${this.opencgaSession}"
                                                            .cellbaseClient="${this.cellbaseClient}"
                                                            .variant="${this.variant}"
                                                            .clinicalAnalysis="${this.clinicalAnalysis}"
                                                            .consequenceTypes="${consequenceTypes}"
                                                            .proteinSubstitutionScores="${this.proteinSubstitutionScores}"
                                                            .config=${this._config.filter.detail}>
                                </variant-interpreter-detail>
                            </div>
                        </div>
                    </div> <!-- Close MainContent -->
                </div> <!-- Close col-md-10 -->
            </div> <!-- Close row -->
        `;
    }
}

customElements.define("variant-interpreter-browser-cancer", VariantInterpreterBrowserCancer);
