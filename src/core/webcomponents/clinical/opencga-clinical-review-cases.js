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
import PolymerUtils from "../PolymerUtils.js";
import "./opencga-clinical-analysis-grid.js";
import "./opencga-clinical-analysis-view.js";


export default class OpencgaClinicalReviewCases extends LitElement {

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
            query: {
                type: Object
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "ocrc-" + UtilsNew.randomString(6);

        this._config = this.getDefaultConfig();
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") || changedProperties.has("query") || changedProperties.has("config")) {
            this.propertyObserver();
        }
    }

    firstUpdated(_changedProperties) {
        this.case = "All";
        this.proband = "All";
        this.family = "All";
        this.disorder = "All";

        this.active = true;

        $("select.selectpicker").selectpicker("render");
    }

    propertyObserver() {
        this._config = Object.assign({}, this.getDefaultConfig(), this.config);

        if (UtilsNew.isNotUndefinedOrNull(this.opencgaSession) && UtilsNew.isNotUndefinedOrNull(this.opencgaSession.study) &&
            UtilsNew.isNotEmptyArray(this.opencgaSession.study.groups)) {
            // let _studyUsers = [opencgaSession.user.id];
            for (const group of this.opencgaSession.study.groups) {
                if (group.id === "@members" || group.name === "@members") {
                    this._studyUsers = group.userIds;
                }
            }
        }

        if (UtilsNew.isNotUndefinedOrNull(this.query)) {
            this.setQueryFilters(this.query);
            this._query = Object.assign({}, this.query);
        }
        this.requestUpdate();
    }

    checkSid(config) {
        return UtilsNew.isNotEmpty(config.sessionId);
    }

    onClearQuery(e) {
        //FIXME monkey patch to reset button (text) fields. TODO complete refactor.
        this.case = "All";
        this.querySelector(`#${this._prefix}caseInput`).value = "";
        this.proband = "All";
        this.querySelector(`#${this._prefix}probandInput`).value = "";
        this.family = "All";
        this.querySelector(`#${this._prefix}familyInput`).value = "";
        this.disorder = "All";
        this.querySelector(`#${this._prefix}disorderInput`).value = "";
        $(".filter-button").css("color","rgb(153, 153, 153)");

        $(`#${this._prefix}-type`).selectpicker("val", "");
        $(`#${this._prefix}-priority`).selectpicker("val", "");
        $(`#${this._prefix}-status`).selectpicker("val", "");
        $(`#${this._prefix}-assigned`).selectpicker("val", "");
        this.updateQuery();
    }

    onSelectClinicalAnalysis(e) {
        this.clinicalAnalysis = e.detail.row;
        this.requestUpdate();
    }

    onFilterChange(e) {
        for (const exampleFilter of this._config.filter.examples) {
            if (e.currentTarget.dataset.filterName === exampleFilter.name) {
                this._query = exampleFilter.query;
                this.setQueryFilters(this._query);
                break;
            }
        }
    }

    onFilterInputText(e) {
        const filterId = e.currentTarget.dataset.id;
        const value = e.currentTarget.value;

        this.updateInputTextMenuItem(filterId, value);
    }

    updateInputTextMenuItem(filterId, value) {
        const buttonElem = PolymerUtils.getElementById(this._prefix + filterId + "Menu");
        console.log(buttonElem);
        console.log(filterId, value, this[filterId]);
        if (UtilsNew.isNotEmpty(value)) {
            this[filterId] = value;
            buttonElem.style.color = "#333";
        } else {
            this[filterId] = "All";
            buttonElem.style.color = "rgb(153, 153, 153)";
        }
        this.requestUpdate();
    }

    updateQuery() {
        const _query = {};

        const defaultValue = "All";

        if (this.case !== defaultValue && this.case !== "") {
            _query.id = this.case;
        }

        if (this.proband !== defaultValue) {
            _query.proband = this.proband;
        }

        if (this.family !== defaultValue) {
            _query.family = this.family;
        }

        if (this.disorder !== defaultValue) {
            _query.disorder = this.disorder;
        }

        const type = $(`#${this._prefix}-type`).selectpicker("val");
        if (UtilsNew.isNotEmpty(type)) {
            _query.type = type.join(",");
        }

        const status = $(`#${this._prefix}-status`).selectpicker("val");
        if (UtilsNew.isNotEmpty(status)) {
            _query.status = status.join(",");
        }

        const priority = $(`#${this._prefix}-priority`).selectpicker("val");
        if (UtilsNew.isNotEmpty(priority)) {
            _query.priority = priority.join(",");
        }

        const assigned = $(`#${this._prefix}-assigned`).selectpicker("val");
        if (UtilsNew.isNotEmpty(assigned)) {
            _query.analystAssignee = assigned.join(",");
        }

        this._query = _query;
        this.requestUpdate();
    }

    setQueryFilters(query) {
        if (UtilsNew.isNotUndefinedOrNull(query.id)) {
            PolymerUtils.setValue(this._prefix + "caseInput", query.id);
            this.updateInputTextMenuItem("case", query.id);
        }

        if (UtilsNew.isNotUndefinedOrNull(query.proband)) {
            PolymerUtils.setValue(this._prefix + "probandInput", query.proband);
            this.updateInputTextMenuItem("proband", query.proband);
        }

        if (UtilsNew.isNotUndefinedOrNull(query.family)) {
            PolymerUtils.setValue(this._prefix + "familyInput", query.family);
            this.updateInputTextMenuItem("family", query.family);
        }

        if (UtilsNew.isNotUndefinedOrNull(query.disorder)) {
            PolymerUtils.setValue(this._prefix + "disorderInput", query.disorder);
            this.updateInputTextMenuItem("disorder", query.disorder);
        }

        if (UtilsNew.isNotUndefinedOrNull(query.type)) {
            $("#" + this._prefix + "-type").selectpicker("val", query.type.split(","));
        }

        if (UtilsNew.isNotUndefinedOrNull(query.status)) {
            $("#" + this._prefix + "-status").selectpicker("val", query.status.split(","));
        }

        if (UtilsNew.isNotUndefinedOrNull(query.priority)) {
            $("#" + this._prefix + "-priority").selectpicker("val", query.priority.split(","));
        }

        if (UtilsNew.isNotUndefinedOrNull(query.assigned)) {
            $("#" + this._prefix + "-assigned").selectpicker("val", query.analystAssignee.split(","));
        }
    }

    _updateValidateFormFields() {
        $("#" + this._prefix + "-assigned").validator("update");
    }

    getDefaultConfig() {
        return {
            title: "Review Cases",
            showTitle: true,
            filter: {
                examples: [
                    {
                        name: "High Priority",
                        active: false,
                        query: {
                            type: "FAMILY",
                            priority: "URGENT,HIGH"
                            // assigned: "cafetero"
                        }
                    }
                ]
            },
            grid: {
                pageSize: 5,
                pageList: [5, 10, 25],
                detailView: false,
                multiSelection: false
            }
        };
    }

    render() {
        return html`
        <style>
            .ocap-text-button {
                display: inline-block;
                overflow: hidden;
                width: 90px;
                text-align: left;
                float: left !important;
            }

            .filter-label {
                margin: auto 10px;
                white-space: nowrap
            }

            .browser-variant-tab-title {
                font-size: 115%;
                font-weight: bold;
            }
            .horizontal-flex{
                display: flex;
            }
            .horizontal-flex > div {
                padding:5px;
                flex:1;
                box-sizing: border-box;
            }
            .horizontal-flex > div label {
                display:block
            }
            .active-filter-label{
                display: inline-block;
                font-size: 15px;
                text-transform: uppercase;
                letter-spacing: 2px;
                height: 34px;
                line-height: 34px;
                margin: 0;
            }
        </style>

        <div class="row">
            <div class="col-md-12">

                <!--<div>-->
                    <!--<h2 style="margin-top: 10px">{{_config.title}}</h2>-->
                <!--</div>-->

                <div style="">

                    <div class="panel panel-default" style="margin-bottom: 10px">
                        <!--<div class="panel-heading">Case Filters</div>-->
                        <div class="panel-body" style="padding: 10px">

                            <div class="btn-group">
                                <p class="active-filter-label">Filters</p>
                            </div>

                            <!-- Case ID -->
                            <div class="btn-group">
                                <button type="button" class="dropdown-toggle btn btn-default filter-button" style="width:125px; color: rgb(153, 153, 153);"
                                        id="${this._prefix}caseMenu"
                                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                                    <span class="ocap-text-button">Case: <span>${this.case}</span></span>&nbsp;<span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="${this._prefix}caseMenu">
                                    <li style="padding: 5px;">
                                        <div style="display: inline-flex; width: 300px;">
                                            <label class="filter-label">Case ID:</label>
                                            <input type="text" id="${this._prefix}caseInput" class="${this._prefix}-input form-control" data-id="case" placeholder="All" @input="${this.onFilterInputText}">
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Proband -->
                            <div class="btn-group">
                                <button type="button" class="btn btn-default dropdown-toggle filter-button" style="width:125px; color: rgb(153, 153, 153);"
                                        id="${this._prefix}probandMenu" title="${this.proband}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                                    <span class="ocap-text-button">Proband: <span>${this.proband}</span></span>&nbsp; <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="${this._prefix}probandMenu">
                                    <li style="padding: 5px;">
                                        <div style="display: inline-flex;width: 300px">
                                            <label class="filter-label">Proband ID:</label>
                                            <input type="text" id="${this._prefix}probandInput" class="${this._prefix}-input form-control" data-id="proband" placeholder="All" @keyup="${this.onFilterInputText}">
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Family -->
                            <div class="btn-group">
                                <button type="button" class="dropdown-toggle btn btn-default filter-button" style="width:125px; color: rgb(153, 153, 153);"
                                        id="${this._prefix}familyMenu" title="${this.family}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                                    <span class="ocap-text-button">Family: <span>${this.family}</span></span>&nbsp; <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="${this._prefix}FamilyMenu">
                                    <li style="padding: 5px;">
                                        <div style="display: inline-flex; width: 300px;">
                                            <label class="filter-label">Family ID:</label>
                                            <input type="text" id="${this._prefix}familyInput" class="${this._prefix}-input form-control" data-id="family" placeholder="All" @input="${this.onFilterInputText}">
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Disorder -->
                            <div class="btn-group">
                                <button type="button" class="dropdown-toggle btn btn-default filter-button" style="width:125px; color: rgb(153, 153, 153);"
                                        id="${this._prefix}disorderMenu" title="${this.disorder}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                                    <span class="ocap-text-button">Disorder: <span>${this.disorder}</span></span>&nbsp; <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu" aria-labelledby="${this._prefix}DisorderMenu">
                                    <li style="padding: 5px;">
                                        <div style="display: inline-flex; width: 300px;">
                                            <label class="filter-label">Disorder ID:</label>
                                            <input type="text" id="${this._prefix}disorderInput" class="${this._prefix}-input form-control" data-id="disorder" placeholder="All" @input="${this.onFilterInputText}">
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Type -->
                            <div class="btn-group">
                                <select class="selectpicker" data-width="125px" id="${this._prefix}-type" multiple
                                        title="Type: All" @change="${this.updateQuery}" style="width:125px; color: rgb(153, 153, 153);">
                                    <option value="SINGLE">Single</option>
                                    <option value="FAMILY">Family</option>
                                    <option value="CANCER">Cancer</option>
                                    <option value="COHORT">Cohort</option>
                                    <option value="AUTOCOMPARATIVE">Autocomparative</option>
                                </select>
                            </div>

                            <!-- Status -->
                            <div class="btn-group">
                                <select class="selectpicker" data-width="125px" id="${this._prefix}-status" multiple
                                        title="Status: All" @change="${this.updateQuery}">
                                    <option value="INCOMPLETE">Incomplete</option>
                                    <option value="READY_FOR_VALIDATION">Ready for Validation</option>
                                    <option value="READY_FOR_INTERPRETATION">Ready for Interpretation</option>
                                    <option value="INTERPRETATION_IN_PROGRESS">Interpretation in Progress</option>
                                    <option value="READY_FOR_INTEPRETATION_REVIEW">Ready for Interpretation Review</option>
                                    <option value="INTERPRETATION_REVIEW_IN_PROGRESS">Interpretation Review in Progress</option>
                                    <option value="READY_FOR_REPORT">Ready for Report</option>
                                    <option value="REPORT_IN_PROGRESS">Report in Progress</option>
                                    <option value="DONE">Done</option>
                                    <option value="REVIEW_IN_PROGRESS">Final Review in Progress</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>

                            <!-- Priority -->
                            <div class="btn-group">
                                <select class="selectpicker" data-width="125px" id="${this._prefix}-priority" multiple
                                        title="Priority: All" @change="${this.updateQuery}">
                                    <option style="color: red; font-weight: bold;" value="URGENT">Urgent</option>
                                    <option style="color: orange; font-weight: bold;" value="HIGH">High</option>
                                    <option style="color: blue; font-weight: bold;" value="MEDIUM">Medium</option>
                                    <option style="color: green; font-weight: bold;" value="LOW">Low</option>
                                </select>
                            </div>

                            <!-- Assignees -->
                            <div class="btn-group">
                                <select class="selectpicker" data-width="125px" id="${this._prefix}-assigned" multiple
                                        title="Assignee: All" @change="${this.updateQuery}">
                                        ${this._studyUsers && this._studyUsers.length ? this._studyUsers.map( item => html`
                                            <option value="${item}">${item}</option>
                                        `) : null }
                                        
                                </select>
                            </div>

                            <!-- Buttons -->
                            <button type="button" class="btn btn-primary btn-sm ripple" @click="${this.updateQuery}">
                                    <i class="fa fa-search" aria-hidden="true" style="padding-right: 5px"></i> Search
                            </button>
                            
                            <div class="pull-right">
                                <button type="button" class="btn btn-primary btn-sm ripple" @click="${this.onClearQuery}">
                                    <i class="fa fa-times" aria-hidden="true" style="padding-right: 5px"></i> Clear
                                </button>
                                <button type="button" class="btn btn-primary btn-sm dropdown-toggle ripple" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i class="fa fa-filter" aria-hidden="true" style="padding-right: 5px"></i> Filters <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-right">
                                    <li><a style="font-weight: bold">Saved Filters</a></li>
                                    ${this._config.filter.examples && this._config.filter.examples.length ? this._config.filter.examples.map( item => html`
                                        <li>
                                            ${item.active ? html`
                                                <a data-filter-name="${item.name}" style="cursor: pointer" @click="${this.onFilterChange}" class="filtersLink">&nbsp;&nbsp;${item.name}</a>
                                            ` : html`
                                                <a data-filter-name="${item.name}" style="cursor: pointer;color: green" @click="${this.onFilterChange}" class="filtersLink">&nbsp;&nbsp;${item.name}</a>
                                            `}
                                        </li>
                                    `) : null}
                                    
                                    ${this.checkSid(this.opencgaSession.opencgaClient._config) ? html`
                                        <li role="separator" class="divider"></li>
                                        <li>
                                            <a style="cursor: pointer" @click="${this.launchModal}"><i class="fa fa-floppy-o" aria-hidden="true" style="padding-right: 5px"></i> Save...</a>
                                        </li>
                                    ` : null }
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <opencga-clinical-analysis-grid .opencgaSession="${this.opencgaSession}"
                                                        .query="${this._query}"
                                                        .active="${this.active}"
                                                        .config="${this._config.grid}"
                                                        @selectrow="${this.onSelectClinicalAnalysis}">
                        </opencga-clinical-analysis-grid>

                        <!-- Bottom tabs with specific variant information -->
                        ${ this.clinicalAnalysis ? html`
                            <div>
                                <h3>Case Study: ${this.clinicalAnalysis.id}</h3>
                                <div>
                                    <ul id="${this._prefix}ViewTabs" class="nav nav-tabs" role="tablist">
                                        <li role="presentation" class="active">
                                            <a href="#${this._prefix}Info" role="tab" data-toggle="tab" class="browser-variant-tab-title" style="font-weight: bold">Summary</a>
                                        </li>
                                        <li role="presentation">
                                            <a href="#${this._prefix}Proband" role="tab" data-toggle="tab" class="browser-variant-tab-title" style="font-weight: bold">Proband Info</a>
                                        </li>
                                    </ul>
    
                                    <div class="tab-content" style="padding: 20px">
                                        <div id="${this._prefix}Info" role="tabpanel" class="tab-pane active">
                                            <div>
                                                <opencga-clinical-analysis-view .opencgaSession="${this.opencgaSession}"
                                                                                .clinicalAnalysisId=${this.clinicalAnalysis.id}
                                                                                .config="${this.config}">
                                                </opencga-clinical-analysis-view>
                                            </div>
                                        </div>
                                        <div id="${this._prefix}Proband" role="tabpanel" class="tab-pane">
                                            <div>
                                                <opencga-individual-view .opencgaSession="${this.opencgaSession}" .individual="${this.clinicalAnalysis.proband}"></opencga-individual-view>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : null }
                    </div>
                </div>
            </div>
        </div>
        `;
    }

}

customElements.define("opencga-clinical-review-cases", OpencgaClinicalReviewCases);
