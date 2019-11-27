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
import "../../../../genome-browser/webcomponent/genome-browser.js";
import "../catalog/samples/opencga-sample-browser.js";

export default class OpencgaVariantInterpreterGenomeBrowser extends LitElement {

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
                type: Object,
            },
            cellbaseClient: {
                type: Object
//                        observer: "init"
            },
            clinicalAnalysisId: {
                type: String,
            },
            clinicalAnalysis: {
                type: Object
            },
            // samples: {
            //     type: Array,
            //     observer: "samplesObserver"
            // },
            region: {
                type: String,
            },
            geneIds: {
                type: Array
            },
            panelIds: {
                type: Array
            },
            active: {
                type: Boolean
            },
            config: {
                type: Object
            }
        }
    }

    _init() {
        this._prefix = "OpencgaVariantInterpreterGenomeBrowser" + Utils.randomString(6) + "_";
        this._availableFiles = [];
        if (!UtilsNew.isNotEmpty(this.region)) {
            this.genomeBrowserRegion = new Region({chromosome: "11", start: 68177378, end: 68177510});
        }
        this._filtersCollapsed = false;

        // The component will show an error message instead of the whole app if no alignment files are found
        this._disabled = true;
        this.displayGenomeBrowserMessage = "inline";
        this._config = this.getDefaultConfig();
        this.tracks = this._config.tracks;
        this.active = false;
    }

    updated(changedProperties) {
        if(changedProperties.has("opencgaSession")) {
            this.onStudyUpdate();
        }
        if(changedProperties.has("clinicalAnalysisId")) {
            this.clinicalAnalysisIdObserver();
        }
        if(changedProperties.has("region")) {
            this.regionObserver();
        }
        if(changedProperties.has("active")) {
            this._setActive();
        }
        if(changedProperties.has("opencgaSession") ||
            changedProperties.has("clinicalAnalysis") ||
            changedProperties.has("panelIds") ||
            changedProperties.has("geneIds") ||
            changedProperties.has("config")) {
            this.propertyObserver(this.opencgaSession, this.clinicalAnalysis, this.panelIds, this.geneIds, this.config);
        }
    }

    propertyObserver(opencgaSession, clinicalAnalysis, panelIds, geneIds, config) {
        this._config = Object.assign(this.getDefaultConfig(), config);

        this.genomeBrowserFilters = {
            title: "Genome Browser Filters",
            active: true,
            filters: [{
                title: "Search by Region",
                example: "e.g. 3:55555-666666",
                id: "region"
            }, {
                title: "Search by Gene",
                example: "Search for Gene Symbols",
                id: "gene"
            }, {
                title: "Panel",
                id: "panel",
                values: panelIds
            }, {
                title: "Show alignments (BAM)",
                id: "alignment"
            }, {
                title: "Show variants (VCF)",
                id: "variant"
            }]
        };

        if (UtilsNew.isNotUndefinedOrNull(this.opencgaSession)) {
            let _this = this;
            if (UtilsNew.isNotEmptyArray(this.panelIds)) {
                this.opencgaSession.opencgaClient.panels().info(panelIds.join(","),
                    {
                        study: _this.opencgaSession.study.fqn,
                        include: "id,name,genes"
                    })
                    .then(function (response) {
                        // _this._panelGenesAvailable = true;
                        let _panels = [];
                        for (let panel of response.response) {
                            _panels.push(panel.result[0]);
                        }
                        _this._genePanels = _panels;
                    })
                    .catch((response) => {
                        console.error("An error occurred fetching clinicalAnalysis: ", response)
                    });
            } else {
                this._genePanels = [];
            }

            if (UtilsNew.isNotUndefinedOrNull(this.clinicalAnalysis)) {
                this.addTracks(this.clinicalAnalysis);
            }
        }
    }

    /**
     * Fetch the CinicalAnalysis object from REST and trigger the observer call.
     */
    clinicalAnalysisIdObserver() {
        if (UtilsNew.isNotUndefinedOrNull(this.opencgaSession) && UtilsNew.isNotEmpty(this.clinicalAnalysisId)) {
            let _this = this;
            this.opencgaSession.opencgaClient.clinical().info(clinicalAnalysis, {study: this.opencgaSession.study.fqn})
                .then(function(response) {
                    // This will trigger the call clinicalAnalysis observer
                    _this.clinicalAnalysis = response.response[0].result[0];
                    _this.addTracks(_this.clinicalAnalysis);
                })
                .catch((response) => {
                    this._disabled = true;
                    console.error("An error occurred fetching clinicalAnalysis: ", response)
                });
        }
    }

    renderDomRepeat(e) {
        $(`#${this._prefix}-geneSelect`).selectpicker('refresh');
        $(`#${this._prefix}-geneSelect`).selectpicker('deselectAll');
    }

    toggleCollapsedFilter() {
        this.set("_filtersCollapsed", !this._filtersCollapsed);
    }

    regionObserver() {
        if (!UtilsNew.isNotEmpty(this.region)) {
            this.genomeBrowserRegion = new Region(this.region);
        }
    }

    onStudyUpdate() {
        if (UtilsNew.isNotUndefinedOrNull(this.opencgaSession) && UtilsNew.isNotUndefinedOrNull(this.opencgaSession.study)) {
            this._availableFiles = [];
            // this.showSelectionInGenomeBrowser();
        }
    }

    showSelectionInGenomeBrowser() {
        let region = PolymerUtils.getValue(this._prefix + "RegionInputText");
        if (UtilsNew.isNotEmpty(region)) {
            this.genomeBrowserRegion = new Region(region);
        }

        let genomeBrowser = PolymerUtils.getElementById(this._prefix  + "gb");

        if (UtilsNew.isNotUndefinedOrNull(genomeBrowser)) {
            let inputArray = document.querySelectorAll('input[name=' + this._prefix + 'file-checkbox]:checked');

            let myVariantFiles = [];
            let myAlignmentFiles = [];
            inputArray.forEach(function(input) {
                let file = input.data;
                if (file.format === "VCF") {
                    myVariantFiles.push(file);
                } else if (file.format === "BAM") {
                    myAlignmentFiles.push(file);
                }
            });

            // Activate genome browser
            // if (myVariantFiles.length > 0 || myAlignmentFiles.length > 0) {
            // Hide Genome Browser initial message
            this.displayGenomeBrowserMessage = "none";
            genomeBrowser.active = true;
            // }
        }
    }

    addTracks(clinicalAnalysis) {
        if (UtilsNew.isUndefinedOrNull(clinicalAnalysis.files) || UtilsNew.isUndefinedOrNull(this.opencgaSession.study)) {
            this._disabled = true;
            return;
        }
        let roleToProband = {};
        if (UtilsNew.isNotUndefinedOrNull(clinicalAnalysis.roleToProband)) {
            roleToProband = clinicalAnalysis.roleToProband;
        }

        let samplesToIndividual = {};
        for (let i = 0; i < clinicalAnalysis.family.members.length; i++) {
            let member = clinicalAnalysis.family.members[i];
            if (UtilsNew.isNotEmptyArray(member.samples)) {
                for (let j = 0; j < member.samples.length; j++) {
                    samplesToIndividual[member.samples[j].id] = member.id;
                }
            }
        }

        let samples = Object.keys(clinicalAnalysis.files);
        let variants = {};
        let alignments = {};
        let coverage = {};
        for (let i = 0; i < samples.length; i++) {
            let files = clinicalAnalysis.files[samples[i]];
            let role = roleToProband[samplesToIndividual[samples[i]]];
            let display = role === samples[i] ? role : `${samples[i]} (${role})`;
            for (let j = 0; j < files.length; j++) {
                files[j].display = display;
                if (files[j].bioformat === "VARIANT") {
                    variants[samples[i]] = files[j];
                } else if (files[j].bioformat === "ALIGNMENT") {
                    alignments[samples[i]] = files[j];
                } else if (files[j].bioformat === "COVERAGE") {
                    coverage[samples[i]] = files[j];
                }
            }
        }

        // Merge alignment and coverage files
        for (let sampleId in alignments) {
            if (UtilsNew.isNotUndefinedOrNull(coverage[sampleId])) {
                alignments[sampleId]['bigwig'] = coverage[sampleId];
            }
        }

        let tracks = this._config.tracks.slice();
        // Add the rest of the tracks
        let _this = this;
        Object.entries(alignments).forEach(
            ([key, value]) => tracks.push(_this._generateAlignmentTrack(value))
        );
        if (clinicalAnalysis.type !== "FAMILY") {
            Object.entries(variants).forEach(
                ([key, value]) => tracks.push(_this._generateVariantTrack(value))
            );
        } else {
            // We only generate one multi sample variant track
            tracks.push(this._generateMultiSampleVariantTrack(variants));
        }

        this.tracks = tracks;

        this._disabled = tracks.length === this._config.tracks.length;
    }

    _generateTrack(file) {
        return {
            type: file.bioformat === "VARIANT" ? "variant" : "alignment",
            config: {
                source: 'opencga',
                data: {
                    study: this.opencgaSession.study.fqn,
                    fileId: file.id
                }
            }
        };
    }

    _generateAlignmentTrack(file, role) {
        let track = {
            type: "alignment",
            // id: `alignment-${file.id}`,
            config: {
                source: 'opencga',
                data: {
                    study: this.opencgaSession.study.fqn,
                    fileId: file.id,
                    name: file.display
                }
            }
        };

        if (UtilsNew.isNotUndefinedOrNull(file['bigwig'])) {
            track['config']['data']['bigwig'] = file['bigwig']['id'];
        }

        return track;
    }

    _generateVariantTrack(file) {
        return {
            type: "variant",
            // id: `variant-${file.sample}`,
            config: {
                source: 'opencga',
                data: {
                    study: this.opencgaSession.study.fqn,
                    // files: [file.id],
                    samples: [file.sample],
                    name: file.display
                }
            }
        };
    }

    _generateMultiSampleVariantTrack(variantFiles) {
        return {
            type: "variant",
            config: {
                source: 'opencga',
                data: {
                    study: this.opencgaSession.study.fqn,
                    samples: Object.keys(variantFiles),
                    name: Object.keys(variantFiles).join(", ")
                }
            }
        };
    }

    getDefaultConfig() {
        return {
            title: "Genome Browser",
            showTitle: true,
            tracks: [{
                type: "sequence"
            }, {
                type: "gene"
            }]
        };
    }

    render() {
        return html`
        <genome-browser .id="${this._prefix}gb"
                        .opencgaSession="${this.opencgaSession}"
                        .cellbaseClient="${this.cellbaseClient}"
                        .region="${this.genomeBrowserRegion}"
                        .tracks="${this.tracks}"
                        .settings="${this.settings}"
                        .filter="${this.genomeBrowserFilters}"
                        .active="${this.active}">
        </genome-browser>
        <!--        <style include="jso-styles">-->
        <!--            .form-section-title {-->
        <!--                padding: 5px 0px;-->
        <!--                width: 80%;-->
        <!--                border-bottom-width: 1px;-->
        <!--                border-bottom-style: solid;-->
        <!--                border-bottom-color: #ddd-->
        <!--            }-->

        <!--            .jso-label-title {-->
        <!--                width: 15em !important;-->
        <!--            }-->
        <!--        </style>-->

        <!--        <template is="dom-if" if="{{_disabled}}">-->
        <!--            <h4 style="color: #940303; margin: 20px 0px; text-align: center">-->
        <!--                No files available.-->
        <!--            </h4>-->
        <!--        </template>-->

        <!--        <template is="dom-if" if="{{!_disabled}}">-->

        <!--            <template is="dom-if" if="{{_config.showTitle}}">-->
        <!--                <div class="panel" style="margin-bottom: 15px">-->
        <!--                    <h3 style="margin: 10px 10px 10px 15px">-->
        <!--                        <i class="fa fa-list" aria-hidden="true"></i> &nbsp;{{_config.title}}-->
        <!--                    </h3>-->
        <!--                </div>-->
        <!--            </template>-->

        <!--            <div class="row " style="padding: 0px 10px; margin: 10px 0px;">-->
        <!--                <div class="col-md-12">-->

        <!--                    <div style="display: block; cursor:pointer;" on-click="toggleCollapsedFilter"-->
        <!--                         data-toggle="collapse" href$="#${this._prefix}collapsibleFilter">-->
        <!--                        <h3 class="form-section-title">-->
        <!--                            <template is="dom-if" if="{{_filtersCollapsed}}">-->
        <!--                                <i class="fa fa-caret-right" aria-hidden="true" style="padding-right: 5px"></i>-->
        <!--                            </template>-->
        <!--                            <template is="dom-if" if="{{!_filtersCollapsed}}">-->
        <!--                                <i class="fa fa-caret-down" aria-hidden="true" style="padding-right: 5px"></i>-->
        <!--                            </template>-->
        <!--                            Genome Browser Filters</h3>-->
        <!--                    </div>-->

        <!--                    <div id="${this._prefix}collapsibleFilter" class="form-horizontal collapse in">-->

        <!--                        <div class="form-group">-->
        <!--                            <label class="control-label col-md-1 jso-label-title">Search by Region</label>-->
        <!--                            <div class="input-group col-md-3" style="padding-left: 15px;padding-right: 15px">-->
        <!--                                <input id="${this._prefix}RegionInputText" type="text" class="form-control" placeholder="e.g. 3:55555-666666">-->
        <!--                                <span class="input-group-btn">-->
        <!--                                <button class="btn btn-default" type="button" on-click="onEraserClicked">-->
        <!--                                    <i class="fa fa-eraser" aria-hidden="true"></i>-->
        <!--                                </button>-->
        <!--                            </span>-->
        <!--                            </div>-->
        <!--                        </div>-->

        <!--                        <div class="form-group">-->
        <!--                            <label class="control-label col-md-1 jso-label-title">Search by Gene</label>-->
        <!--                            <div class="col-md-3">-->
        <!--                                <cellbase-gene-filter cellbase-client="{{cellbaseClient}}"-->
        <!--                                                      erase="{{eraseSearchGene}}"-->
        <!--                                                      on-genechange="onInputGeneChange">-->
        <!--                                </cellbase-gene-filter>-->
        <!--                            </div>-->
        <!--                        </div>-->

        <!--                        <div class="form-group">-->
        <!--                            <label class="control-label col-md-1 jso-label-title">Select a Gene from Panel</label>-->
        <!--                            <div class="col-md-3">-->
        <!--                                <select class="selectpicker" id="${this._prefix}-geneSelect" data-live-search="true" data-max-options="1"-->
        <!--                                        on-dom-change="renderDomRepeat" multiple>-->
        <!--                                    <optgroup label="Selected Genes">-->
        <!--                                        <template is="dom-repeat" items="{{geneIds}}" as="geneId">-->
        <!--                                            <option>{{geneId}}</option>-->
        <!--                                        </template>-->
        <!--                                    </optgroup>-->

        <!--                                    <template is="dom-repeat" items="{{_genePanels}}" as="panel">-->
        <!--                                        <optgroup label="{{panel.name}}">-->
        <!--                                            <template is="dom-repeat" items="{{panel.genes}}" as="gene">-->
        <!--                                                <option>{{gene.name}}</option>-->
        <!--                                            </template>-->
        <!--                                        </optgroup>-->
        <!--                                    </template>-->
        <!--                                </select>-->
        <!--                            </div>-->
        <!--                        </div>-->

        <!--                        <div class="form-group">-->
        <!--                            <label class="control-label col-md-1 jso-label-title">Show Alignments (BAM)</label>-->
        <!--                            <div class="col-md-3">-->
        <!--                                <input type="checkbox">-->
        <!--                            </div>-->
        <!--                        </div>-->

        <!--                        <div class="form-group">-->
        <!--                            <div class="col-md-offset-3 col-md-9">-->
        <!--                                <button type="submit" class="btn btn-primary" on-click="onClear">Clear</button>-->
        <!--                                <button type="submit" class="btn btn-primary" on-click="showSelectionInGenomeBrowser">Render</button>-->
        <!--                            </div>-->
        <!--                        </div>-->
        <!--                    </div>-->

        <!--                    &lt;!&ndash;<div class="col-md-6" style="margin-top: 15px;">&ndash;&gt;-->
        <!--                    &lt;!&ndash;<button id="${this._prefix}RunGenomeBrowser" type="button" class="btn btn-primary"&ndash;&gt;-->
        <!--                    &lt;!&ndash;on-click="showSelectionInGenomeBrowser" style="float: right">&ndash;&gt;-->
        <!--                    &lt;!&ndash;Show Genome Browser&ndash;&gt;-->
        <!--                    &lt;!&ndash;</button>&ndash;&gt;-->
        <!--                    &lt;!&ndash;</div>&ndash;&gt;-->
        <!--                </div>-->


        <!--                &lt;!&ndash; Genome browser &ndash;&gt;-->
        <!--                <div class="col-md-12">-->
        <!--                    <h3 class="form-section-title">Genome Browser</h3>-->

        <!--                    &lt;!&ndash;<div style$="padding: 20px 0px;display: {{displayGenomeBrowserMessage}};">&ndash;&gt;-->
        <!--                    &lt;!&ndash;<div style="padding: 20px">&ndash;&gt;-->
        <!--                    &lt;!&ndash;<span style="font-weight: bolder">Please select some data above</span>&ndash;&gt;-->
        <!--                    &lt;!&ndash;</div>&ndash;&gt;-->
        <!--                    &lt;!&ndash;</div>&ndash;&gt;-->

        <!--                    <div style="padding: 20px">-->
        <!--                        <genome-browser id="${this._prefix}gb" opencga-session={{opencgaSession}} cellbase-client="{{cellbaseClient}}"-->
        <!--                                        region="{{genomeBrowserRegion}}" tracks="{{tracks}}" settings="{{settings}}" active="{{active}}">-->
        <!--                        </genome-browser>-->
        <!--                    </div>-->
        <!--                </div>-->
        <!--            </div>-->
        <!--        </template>-->
        `;
    }
}

customElements.define("opencga-variant-interpreter-genome-browser", OpencgaVariantInterpreterGenomeBrowser);
