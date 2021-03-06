/*<link rel="import" href="variant-clinical-upload-new.html">
<link rel="import" href="variant-clinical-samples.html">
<link rel="import" href="../../variant/opencga-variant-interpretation.html">
<link rel="import" href="../report/variant-clinical-report.html">
<link rel="import" href="../opencga-clinical-analysis-browser.html">
<link rel="import" href="../opencga-clinical-analysis-view.html">
<link rel="import" href="../clinical-interpretation-view.html">
<link rel="import" href="../../opencga-message-dialog.html">
<link rel="import" href="../opencga-clinical-analysis-grid.html">*/

import UtilsNew from "../../../utilsNew.js";


class OpencgaVariantClinical extends LitElement {

            constructor() {
                super();

                // Set status and init private properties
                this._init();
            }

            static get properties() {
                return {
                    opencgaSession: {
                        type: Object
                    },
                    toolTitle: {
                        type: String
                    },
                    samples: {
                        type: Array,
                        notify: true
                    },
                    opencgaClient: {
                        type: Object
                    },
                    cellbaseClient: {
                        type: Object
                    },
                    populationFrequencies: {
                        type: Object
                    },
                    consequenceTypes: {
                        type: Object
                    },
                    config: {
                        type: Object
                    },
                    proteinSubstitutionScores: {
                        type: Object
                    },
                    query: {
                        type: Object
                    },
                    search: {
                        type: Object
                    },
                    analysisSelected: {
                        type: Object,
                    },
                    clinicalAnalysis: {
                        type: Object,
                    },
                    showMessageModal: {
                        type: Boolean,
                        notify: true
                    },
                    settingsMessageModal: {
                        type: Object,
                        notify: true
                    },
                    checkPermissions: {
                        type: Boolean,
                        computed: '_checkPermissions(opencgaSession.project)'
                    },
                    eventNotifyName: {
                        type: String,
                        value: "messageevent"
                    },
                    panelExamples: {
                        type: Array
                    }
                }
            }

    createRenderRoot() {
        return this;
    }

            _init() {
                this.prefix = "clinical-analysis-view-" + UtilsNew.randomString(6) + "_";

                this.toolTitle = "Clinical Analysis";
                this.mode = "clinical";
                this.activePrioritization = false;
                this.activeReport = false;
                this.checkExistsRecentInterpretations = false;
                this.checkExistsRecentAnalysis = false;
                this.activesTab = {
                    uploadTab: true,
                    analysisTab: false,
                    prioritizationTab: false,
                    reportTab: false
                };

                this.interactive = false;
                this.clinicalAnalysisQuery = {sort: "id", limit: 5};
                this.clinicalAnalysisGridConfig = {pagination: false, pageSize: 2, pageList: [1, 2]};
                this.showLastRecent = true;
                this.showLastRecentInterpretation = true;
                // TODO REMOVE IT!!!!!
                if (typeof PANELS !== "undefined") {
                    let panelList = PANELS.slice();
                    panelList.sort((a, b) => {
                        if (a.title === b.title) {
                            return 0;
                        }
                        return a.title < b.title ? -1 : 1;
                    });
                    this.set("panelList", panelList);
                }
                window.icons = {
                    refresh: 'fa-refresh',
                    columns: 'fa-th',
                    paginationSwitchDown: 'fa-caret-square-o-down',
                    paginationSwitchUp: 'fa-caret-square-o-up'
                };
            }

    updated(changedProperties) {
        if (changedProperties.has("getRecentInterpretations")) {
            this.clinicalAnalysis();
        }
        if (changedProperties.has("analysisSelected")) {
            this.analysisSelected();
        }
        if (changedProperties.has("search")) {
            this.fetchVariants();
        }
    }
            connectedCallback() {
                super.connectedCallback();

                // Initialise the default mode
                for (let alg of this.config.interpretation.algorithms) {
                    if (alg.id === "interactive" && alg.checked) {
                        this.interactive = true;
                    }
                }

                $('select.selectpicker').selectpicker('render');
                this.config.interpretation = JSON.parse(JSON.stringify(this.config.interpretation));
                this.config.interpretation.filter.menu.sections = this.config.interpretation.filter.menu.sections.map((section) => {
                    section.subsections = section.subsections.map((subsection) => {
                        if (subsection.id === "sample") {
                            subsection.showSelectSamples = false;
                        }
                        return subsection
                    })
                    return section;
                });
                // if (UtilsNew.isNotUndefinedOrNull(this.panelList)) {
                //     let options = "";
                //     this.panelList.sort((a, b) => {
                //         if (a.title === b.title) {
                //             return 0;
                //         }
                //         return a.title < b.title ? -1 : 1;
                //     }).forEach((item) => {
                //         options += `<option value="${item.name}">${item.title} (${item.genes.length})</option>`;
                //     });
                //
                //     let html = `
                //          <select id="${prefix}PanelApps" class="selectpicker show-tick ${prefix}FilterSelect" data-size="10" data-live-search="true"
                //                 data-max-options="1" data-selected-text-format="count" multiple>
                //             ${options}
                //         </select>
                //         <div style="padding-top: 5px">
                //             <textarea id="${prefix}PanelAppsTextarea" name="panelAppsTextarea"
                //                       class="form-control clearable ${prefix}FilterTextInput"
                //                       rows="3" placeholder="No panel selected"></textarea>
                //         </div>
                //     `;
                //
                //     // PolymerUtils.getElementById(this.)
                // }
            }

            changeTool(e) {
                e.preventDefault(); // prevents the hash change to "#" and allows to manipulate the hash fragment as needed
                for (let property in this.activesTab) {
                    this.set("activesTab." + property, false);
                }

                let id = this.prefix;
                if (UtilsNew.isNotUndefinedOrNull(e.detail.idTab) && UtilsNew.isNotUndefinedOrNull(e.detail.idTab)){
                    id += e.detail.idTab;
                } else {
                    id += e.target.getAttribute("data-id");
                }

                this.changeToolById(id);
            }

            changeToolById(id) {
                if (id === this.prefix + "SamplesButton") {
                    this.set("activesTab.analysisTab", true);
                    this.activePrioritization = false;
                    this.activeReport = false;
                }

                if (id === this.prefix + "UploadButton") {
                    this.set("activesTab.uploadTab", true);
                    this.activePrioritization = false;
                    this.activeReport = false;
                }

                if (id === this.prefix + "PrioritizationButton") {
                    this.set("activesTab.prioritizationTab", true);
                    this.activePrioritization = false;
                    this.activeReport = false;
                    // this.getRecentAnalysis();
                }

                if (id === this.prefix + "ReportButton") {
                    this.set("activesTab.reportTab", true);
                    this.activePrioritization = false;
                    this.activeReport = false;
                    this.getRecentInterpretations();
                }
            }

            computedClassTabs(isActive) {
                return !isActive ? "btn-success" : "btn-primary";
            }

            onClear() {
                this.query = {studies: this.opencgaSession.project.alias + ":" + this.opencgaSession.study.alias};
                this.search = {};
            }

            showClinicalSelector(e) {
                e.preventDefault();
                this.analysisModal = UtilsNew.isUndefined(this.analysisModal) ? true : !this.analysisModal;
                this.checkExistsRecentAnalysis = false;
                $("#" + this.prefix + "AnalysisBrowser").modal('show');
            }


            onRecentAnalysisSelected(e) {
                e.preventDefault(); // prevents the hash change to "#" and allows to manipulate the hash fragment as needed
                this.clinicalAnalysis = e.detail;
                this.clinicalAnalysisId = this.clinicalAnalysis.id;

                this.checkTypeAnalysisSelected(this.clinicalAnalysis);
            }

            onAnalysisSelected(e) {
                e.preventDefault(); // prevents the hash change to "#" and allows to manipulate the hash fragment as needed
                this.clinicalAnalysis = this.analysisSelected;
                this.clinicalAnalysisId = this.analysisSelected.id;
                this.showLastRecent = false;
                this.showLastRecentInterpretation = false;
                this.checkTypeAnalysisSelected(this.clinicalAnalysis);
            }

            analysisSelectedObserver() {
                this.clinicalAnalysis = null;
                this.clinicalAnalysisId = null;
            }

            selectAnalysisMode(e) {
                this.interactive = e.target.value === "interactive";
                this.checkTypeAnalysisSelected(this.clinicalAnalysis);
            }
            onClickOkPrioritization() {
                if (UtilsNew.isNotUndefinedOrNull(this.clinicalAnalysis)) {

                    if (!this.interactive && UtilsNew.isUndefinedOrNull(this.diseasePanelId)) {
                        let _message = "You must select a panel to continue.";

                        this.dispatchEvent(new CustomEvent(this.eventNotifyName, {
                            detail: {
                                message: _message,
                                type: UtilsNew.MESSAGE_INFO
                            },
                            bubbles: true,
                            composed: true
                        }));
                    } else {
                        this.activePrioritization = true;
                        $('select.selectpicker').selectpicker('render');
                    }
                } else {
                    let _message = "You must select an analysis to continue.";

                    this.dispatchEvent(new CustomEvent(this.eventNotifyName, {
                        detail: {
                            message: _message,
                            type: UtilsNew.MESSAGE_INFO
                        },
                        bubbles: true,
                        composed: true
                    }));
                }
            }

            getRecentInterpretations() {
                if (UtilsNew.isNotUndefinedOrNull(this.clinicalAnalysis)) {
                    this.recentInterpretations = this.clinicalAnalysis.interpretations;
                    this.interpretationId = null;
                    if (UtilsNew.isNotUndefinedOrNull(this.recentInterpretations) && UtilsNew.isNotEmptyArray(this.recentInterpretations)){
                        this.interpretationId = this.clinicalAnalysis.interpretations[0].id;
                    }
                    this.checkExistsRecentInterpretations = !UtilsNew.isEmptyArray(this.recentInterpretations);
                }
            }


            selectInterpretationRecent(e) {
                if (UtilsNew.isNotUndefinedOrNull(this.recentAnalysis) && UtilsNew.isNotUndefinedOrNull(e.target.value)) {
                    this.interpretationId = e.target.value;
                }
            }

            isCheckedDefaultAnalysis(clinicalAnalysisId) {
                if (UtilsNew.isNotUndefinedOrNull(this.clinicalAnalysisId) && this.clinicalAnalysisId === clinicalAnalysisId) {
                    return true;
                }
                return false
            }

            isCheckedDefaultInterpretation(currentIndex, interpretationId) {
                if (currentIndex === 0) {
                    this.interpretationId = interpretationId;
                    return true;
                } else if (UtilsNew.isNotUndefinedOrNull(this.interpretationId) && this.interpretationId === interpretationId) {
                    return true;
                }

                return false
            }

            onCreateReport(e, data) {
                this.interpretationReport = data.interpretation;
                this.activeReport = true;
            }

            _checkPermissions(project) {
                return UtilsNew.checkPermissions(project);
            }

            _formatDate(date) {
                return moment(date, "YYYYMMDDHHmmss").format('D MMM YY');
            }

            isAutomaticMode(mode) {
                return mode === "automatic";
            }
            updateSelectPicker(){
                $('select.selectpicker').selectpicker('render');
            }

            clearSelectedAnalysis(){
                this.showLastRecent = true;
                this.showLastRecentInterpretation = true;
                this.analysisSelectedObserver();
            }

            onDiseasePanelChange(e) {
                this.diseasePanelId = e.target.value;
            }

            checkTypeAnalysisSelected(analysis) {
                // Disabled by default Diseases Panel
                PolymerUtils.setPropertyById(this.prefix + "DiseasePanels", "disabled", true);

                // If analysis type selected is not single we disabled automatic mode completely and we checked interactive mode by default
                if (analysis.type.toLowerCase() !== "single") {
                    PolymerUtils.setPropertyById(this.prefix + "automaticMode", "disabled", true);
                    PolymerUtils.setPropertyById(this.prefix + "automaticMode", "checked", false);
                    PolymerUtils.setPropertyById(this.prefix + "interactiveMode", "checked", true);
                    // This remove the selected panel
                    $(PolymerUtils.getElementById(this.prefix + "DiseasePanels")).val("default");
                    this.diseasePanelId = undefined;
                    this.interactive = true;
                } else {
                    PolymerUtils.setPropertyById(this.prefix + "automaticMode", "disabled", false);
                    if (!this.interactive) {
                        PolymerUtils.setPropertyById(this.prefix + "DiseasePanels", "disabled", false);
                    } else {
                        $(PolymerUtils.getElementById(this.prefix + "DiseasePanels")).val("default");
                        this.diseasePanelId = undefined;
                        this.interactive = true;
                    }
                }
                // Refresh Boostrap Select component
                $(PolymerUtils.getElementById(this.prefix + "DiseasePanels")).selectpicker("refresh");
            }

            render() {
                return html`
                <template>
        <style>
            /* From http://code-chunk.com/chunks/543df4c394758/bootstrap-arrow-shaped-buttons */
            .analysis-button.btn-arrow-right,
            .analysis-button.btn-arrow-left {
                position: relative;
                padding-left: 18px;
                padding-right: 18px;
            }

            .analysis-button.btn-arrow-right {
                padding-left: 36px;
            }

            .analysis-button.btn-arrow-left {
                padding-right: 36px;
            }

            .btn-arrow-right:before,
            .btn-arrow-right:after,
            .btn-arrow-left:before,
            .btn-arrow-left:after { /* make two squares (before and after), looking similar to the button */
                content: "";
                position: absolute;
                top: 5px; /* move it down because of rounded corners */
                width: 22px; /* same as height */
                height: 22px; /* button_outer_height / sqrt(2) */
                background: inherit; /* use parent background */
                border: inherit; /* use parent border */
                border-left-color: transparent; /* hide left border */
                border-bottom-color: transparent; /* hide bottom border */
                border-radius: 0px 4px 0px 0px; /* round arrow corner, the shorthand property doesn't accept "inherit" so it is set to 4px */
                -webkit-border-radius: 0px 4px 0px 0px;
                -moz-border-radius: 0px 4px 0px 0px;
            }

            .btn-arrow-right:before,
            .btn-arrow-right:after {
                transform: rotate(45deg); /* rotate right arrow squares 45 deg to point right */
                -webkit-transform: rotate(45deg);
                -moz-transform: rotate(45deg);
                -o-transform: rotate(45deg);
                -ms-transform: rotate(45deg);
            }

            .btn-arrow-left:before,
            .btn-arrow-left:after {
                transform: rotate(225deg); /* rotate left arrow squares 225 deg to point left */
                -webkit-transform: rotate(225deg);
                -moz-transform: rotate(225deg);
                -o-transform: rotate(225deg);
                -ms-transform: rotate(225deg);
            }

            .btn-arrow-right:before,
            .btn-arrow-left:before { /* align the "before" square to the left */
                left: -11px;
            }

            .btn-arrow-right:after,
            .btn-arrow-left:after { /* align the "after" square to the right */
                right: -11px;
            }

            .btn-arrow-right:after,
            .btn-arrow-left:before { /* bring arrow pointers to front */
                z-index: 1;
            }

            .btn-arrow-right:before,
            .btn-arrow-left:after { /* hide arrow tails background */
                background-color: white;
            }
            .btn:focus,
            .btn:active {
                box-shadow: none;
            }

            .analysis-button {
                outline: none!important;
            }

            div.bootstrap-select {
                width: 220px!important ;
            }
        </style>

        <template is="dom-if" if="{{checkPermissions}}">
            <span style="text-align: center"><h3>No public projects available to browse. Please login to continue</h3></span>
        </template>

        <template is="dom-if" if="{{!checkPermissions}}">

            <div class="panel">
                <h3 style="margin: 10px 10px 10px 15px">
                    <i class="fa fa-sitemap" aria-hidden="true"></i>
                    &nbsp;{{toolTitle}}
                </h3>
            </div>

            <div class="col-md-12">
                <div class="col-md-6" style="float: none;margin: auto">
                    <template is="dom-if" if="{{config.upload.visible}}">
                        <button id="{{prefix}}UploadButton" type="button" data-id="UploadButton"
                                class$="analysis-button btn {{computedClassTabs(activesTab.uploadTab)}} btn-arrow-right"
                                on-click="changeTool" data-toggle="tooltip" data-placement="top" title="Upload sample">
                            <i class="fa fa-upload"  data-id="UploadButton" aria-hidden="true"></i> Upload
                        </button>
                    </template>
                    <template is="dom-if" if="{{config.analysis.visible}}">
                        <button id="{{prefix}}SamplesButton" type="button" data-id="SamplesButton"
                                class$="analysis-button btn {{computedClassTabs(activesTab.analysisTab)}} btn-arrow-right"
                                on-click="changeTool" data-toggle="tooltip" data-placement="top"
                                title="Connect, link & choose analysis of samples" >
                            <i class="fa fa-sitemap" data-id="SamplesButton" aria-hidden="true"></i> Analysis
                        </button>
                    </template>
                    <template is="dom-if" if="{{config.interpretation.visible}}">
                        <button id="{{prefix}}PrioritizationButton" type="button" data-id="PrioritizationButton"
                                class$="analysis-button btn {{computedClassTabs(activesTab.prioritizationTab)}} btn-arrow-right"
                                on-click="changeTool"
                                data-toggle="tooltip" data-placement="top" title="Filter & Prioritization">
                            <i class="fa fa-filter" data-id="PrioritizationButton" aria-hidden="true"></i> {{config.interpretation.title}}
                        </button>
                    </template>
                    <template is="dom-if" if="{{config.report.visible}}">
                        <button id="{{prefix}}ReportButton" type="button" data-id="ReportButton"
                                class$="analysis-button btn {{computedClassTabs(activesTab.reportTab)}} btn-arrow-right"
                                on-click="changeTool"
                                data-toggle="tooltip" data-placement="top" title="Generate report">
                            <i class="fa fa-file-text"  data-id="ReportButton" aria-hidden="true"></i> Report
                        </button>
                    </template>
                </div>
            </div>

            <!-- UPLOAD TAB -->
            <div class="col-md-12">
                <template is="dom-if" if="{{activesTab.uploadTab}}">
                    <div class$="analysis-content" id="{{prefix}}UploadButtonDiv">
                        <variant-clinical-upload-new opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}" config="{{config}}"
                                                     event-notify-name="{{eventNotifyName}}">
                        </variant-clinical-upload-new>
                    </div>
                </template>

                <!-- ANALYSIS TAB -->
                <template is="dom-if" if="{{activesTab.analysisTab}}">
                    <div class$="analysis-content" id="{{prefix}}SamplesButtonDiv">
                        <variant-clinical-samples opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}"
                                                  samples="{{samples}}" prefix="{{prefix}}" config="{{config}}" event-notify-name="{{eventNotifyName}}">
                        </variant-clinical-samples>
                    </div>
                </template>

                <!-- INTERPRETATION TAB -->
                <template is="dom-if" if="{{activesTab.prioritizationTab}}">

                    <template is="dom-if" if="{{!activePrioritization}}">
                        <div class="col-md-offset-1 col-md-10">

                            <div class="col-md-12">
                                <h3>Select Clinical Analysis</h3>
                                <hr style="width: 80%; margin: 2px 0px;border-top: 2px solid #eee">
                                <div style="padding: 10px 10px">
                                    <button id="{{prefix}}clearSelectedAnalysis" data-toggle="modal" role="button" data-placement="bottom"
                                            on-click="clearSelectedAnalysis" class="btn btn-sm btn-primary" style="display: inline; float:right; margin:0 25%;">
                                        Clear
                                    </button>
                                    <div class="form-group">
                                        <div class="">
                                            <span for="{{prefix}}SelectOtherAnalysis">Select a recent analysis from the table (last 5 analysis) or select a clinical analysis </span>
                                            <button id="{{prefix}}SelectOtherAnalysis" data-toggle="modal" role="button" data-placement="bottom"
                                                    on-click="showClinicalSelector" class="btn btn-sm btn-primary" style="display: inline">
                                                Browse...
                                            </button>
                                        </div>
                                    </div>
                                    <template is="dom-if" if="{{showLastRecent}}" restamp="true">
                                        <div id="{{prefix}}OpencgaClinicalAnalysisGrid">

                                            <opencga-clinical-analysis-grid opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}"
                                                                            query="{{clinicalAnalysisQuery}}" config="{{clinicalAnalysisGridConfig}}"
                                                                            on-analysis-selected="onRecentAnalysisSelected" analysis="{{clinicalAnalysis}}">
                                            </opencga-clinical-analysis-grid>
                                        </div>
                                    </template>

                                    <template is="dom-if" if="{{!showLastRecent}}">
                                        <div id="{{prefix}}OpencgaClinicalAnalysisGrid2" style="padding: 5px 10px">
                                            <clinical-analysis-view opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}"
                                                                    clinical-analysis-id="{{clinicalAnalysisId}}" title="Clinical analysis selected">
                                            </clinical-analysis-view>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <div class="col-md-12" style="padding-top: 20px">
                                <h3>Interpretation Algorithm</h3>
                                <hr style="width: 80%; margin: 2px 0px;border-top: 2px solid #eee">
                                <div class="form-group" style="padding: 10px 10px">
                                    <p>Several prioritization and interpretation algorithms are available, you can choose an <span style="font-weight: bold">interactive</span> tool:</p>
                                    <template is="dom-repeat" items="{{config.interpretation.algorithms}}" as="algorithm">
                                        <div id="{{prefix}}{{algorithm.id}}ModeDiv">
                                            <template is="dom-if" if="{{algorithm.checked}}">
                                                <input id="{{prefix}}{{algorithm.id}}Mode" type="radio" name="analysisRadioButtons" value="{{algorithm.id}}" class$="{{prefix}}FilterRadio"
                                                       checked on-change="selectAnalysisMode" style="padding-left: 20px"> {{algorithm.title}}<br>
                                            </template>
                                            <template is="dom-if" if="{{!algorithm.checked}}">
                                                <input id="{{prefix}}{{algorithm.id}}Mode" type="radio" name="analysisRadioButtons" value="{{algorithm.id}}" class$="{{prefix}}FilterRadio"
                                                       on-change="selectAnalysisMode" style="padding-left: 20px"> {{algorithm.title}}<br>
                                            </template>

                                            <template is="dom-if" if="{{isAutomaticMode(algorithm.id)}}">
                                                <span style="padding-left: 20px">Select a disease panels </span>
                                                <select id="{{prefix}}DiseasePanels" class="selectpicker show-tick" data-size="10" data-live-search="true"
                                                        data-max-options="1" data-selected-text-format="count" on-change="onDiseasePanelChange" multiple>
                                                    <template is="dom-repeat" items="{{panelList}}" as="panel" on-dom-change="updateSelectPicker">
                                                        <option value="{{panel.id}}">{{panel.title}} ({{panel.genes.length}})</option>
                                                    </template>
                                                </select>
                                            </template>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <div class="col-md-12">
                                <div style="float: right; margin:0 25%;">
                                    <button id="clickOkPrioritization" type="button" class="btn btn-lg btn-primary" on-click="onClickOkPrioritization">
                                        Go to Interpretation
                                    </button>
                                </div>
                            </div>
                        </div>
            </div>
        </template>

        <template is="dom-if" if="{{activePrioritization}}">
            <div style="margin: auto">
                <opencga-variant-interpretation opencga-session="{{opencgaSession}}" config="{{config.interpretation}}"
                                                samples="{{samples}}" disease-panel-id="{{diseasePanelId}}"
                                                population-frequencies="{{populationFrequencies}}"
                                                protein-substitution-scores="{{proteinSubstitutionScores}}" consequence-types="{{consequenceTypes}}"
                                                opencga-client="{{opencgaClient}}"
                                                cellbase-client="{{cellbaseClient}}"
                                                beacon-hosts="{{config.tools.beacon.hosts}}" on-gene="geneSelected"
                                                clinical-analysis-id="{{clinicalAnalysisId}}" on-backtoselectanalysis="changeTool" event-notify-name="{{eventNotifyName}}"
                                                interactive="{{interactive}}" panel-examples="{{panelExamples}}">
                </opencga-variant-interpretation>
            </div>
        </template>
    </template>

    <!-- REPORT TAB -->
    <template is="dom-if" if="{{activesTab.reportTab}}">
        <template is="dom-if" if="{{!activeReport}}">
            <div class="col-md-offset-1 col-md-10 ">
                <div class="analysis-content" id="{{prefix}}ReportButtonDiv">
                    <h3>Clinical Analysis {{clinicalAnalysis.name}}</h3>
                    <div style="padding: 10px 10px">
                        <button id="{{prefix}}clearSelectedAnalysisInterpretation" data-toggle="modal" role="button" data-placement="bottom"
                                on-click="clearSelectedAnalysis" class="btn btn-sm btn-primary" style="display: inline; float:right; margin:0 25%;">
                            Clear
                        </button>
                        <div class="form-group">
                            <div class="">
                                <span for="{{prefix}}SelectOtherAnalysisInterpretation">Select a recent analysis from the table (last 5 analysis) or select a clinical analysis </span>
                                <button id="{{prefix}}SelectOtherAnalysisInterpretation" data-toggle="modal" role="button" data-placement="bottom"
                                        on-click="showClinicalSelector" class="btn btn-sm btn-primary" style="display: inline">
                                    Browse...
                                </button>
                            </div>
                        </div>
                        <template is="dom-if" if="{{showLastRecentInterpretation}}" restamp="true">
                            <div id="{{prefix}}OpencgaClinicalAnalysisGridInterpretation">
                                <opencga-clinical-analysis-grid opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}"
                                                                query="{{clinicalAnalysisQuery}}" config="{{clinicalAnalysisGridConfig}}"
                                                                on-analysis-selected="onRecentAnalysisSelected" analysis="{{clinicalAnalysis}}">
                                </opencga-clinical-analysis-grid>
                            </div>
                        </template>

                        <template is="dom-if" if="{{!showLastRecentInterpretation}}">
                            <div id="{{prefix}}OpencgaClinicalAnalysisGrid2Interpretation" style="padding: 5px 10px">
                                <clinical-analysis-view opencga-session="{{opencgaSession}}" opencga-client="{{opencgaClient}}"
                                                        clinical-analysis-id="{{clinicalAnalysisId}}" title="Clinical analysis selected">
                                </clinical-analysis-view>
                            </div>
                        </template>
                    </div>
                    <h3>Clinical Interpretation</h3>
                    <div class="col-md-12" style="padding: 10px 15px">

                        <div class="form-group col-md-12" id="{{prefix}}selectInterpretationType">
                            <h4>Select Interpretation:</h4>
                            <div style="padding: 10px 20px">
                                <template is="dom-if" if="{{!checkExistsRecentInterpretations}}">
                                    <span>No interpretation found</span>
                                </template>

                                <template is="dom-if" if="{{checkExistsRecentInterpretations}}" >
                                    <template is="dom-repeat" items="{{recentInterpretations}}" as="interpretation" index-as="i">
                                        <input id="{{prefix}}sampleRadio{{interpretation.id}}" type="radio" name="interpretationRecentRadioButtons" value="{{interpretation.file.id}}"
                                               class$="{{prefix}}FilterRadio" on-change="selectInterpretationRecent"
                                               checked$="{{isCheckedDefaultInterpretation(i, interpretation.file.id)}}" style="padding-left: 20px"> {{interpretation.name}}<br>
                                    </template>
                                </template>
                            </div>
                        </div>

                    </div>
                    <div class="col-md-12" style="padding: 10px 15px">
                        <template is="dom-if" if="{{interpretationId}}">
                            <clinical-interpretation-view id="id" interpretation-id={{interpretationId}} opencga-session="{{opencgaSession}}"
                                                          opencga-client="{{opencgaClient}}" cellbase-client="{{cellbaseClient}}"
                                                          consequence-types="{{consequenceTypes}}" protein-substitution-scores="{{proteinSubstitutionScores}}"
                                                          on-createreport="onCreateReport" style="font-size: 12px">
                            </clinical-interpretation-view>
                        </template>
                    </div>
                </div>
            </div>

        </template>
        <template is="dom-if" if="{{activeReport}}" restamp="true">
            <variant-clinical-report opencga-client="{{opencgaClient}}" opencga-session="{{opencgaSession}}" config="{{config}}"
                                     tool-title="Report of {{clinicalAnalysis.name}}" interpretation="{{interpretationReport}}" analysis="{{clinicalAnalysis}}" expReport="true">
            </variant-clinical-report>
        </template>
    </template>
    </div>

    <opencga-message-dialog opencga-client="{{opencgaClient}}" show-message-modal="{{showMessageModal}}" settings-message-modal="{{settingsMessageModal}}"></opencga-message-dialog>

    <div class="modal fade" id="{{prefix}}AnalysisBrowser" tabindex="-1" role="dialog" aria-labelledby="sampleBrowserLabel">
        <div class="modal-dialog modal-lg" role="document" style="width: 1440px;">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="{{prefix}}AnalysisBrowserLabel">Analysis Selector</h4>
                </div>
                <div class="modal-body" style="height: 780px">
                    <opencga-clinical-analysis-browser opencga-client="{{opencgaClient}}" opencga-session="{{opencgaSession}}" analysis-selected="{{analysisSelected}}"
                                               analysis-modal="{{analysisModal}}" style="font-size: 12px">
                    </opencga-clinical-analysis-browser>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-dismiss="modal" on-click="onAnalysisSelected">
                        OK
                    </button>
                </div>
            </div>
        </div>
    </div>
    </template>
    </template>
`
            }
        }

customElements.define("opencga-variant-clinical", OpencgaVariantClinical);
