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
import GridCommons from "../variant/grid-commons.js";
import UtilsNew from "../../utilsNew.js";
import CatalogUIUtils from "../commons/CatalogUIUtils.js";
import "../commons/opencb-grid-toolbar.js";


export default class OpencgaIndividualGrid extends LitElement {

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
            individuals: {
                type: Array
            },
            // search: {
            //     type: Object
            // },
            active: {
                type: Boolean
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "VarIndividualGrid" + UtilsNew.randomString(6);

        this.catalogUiUtils = new CatalogUIUtils();
        this.active = false;
        this.gridId = this._prefix + "IndividualBrowserGrid";
        this.checkedRows = new Map();
    }

    connectedCallback() {
        super.connectedCallback();

        this._config = {...this.getDefaultConfig(), ...this.config};
        this.gridCommons = new GridCommons(this.gridId, this, this._config);
    }

    firstUpdated(_changedProperties) {
        this.table = this.querySelector("#" + this.gridId);
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") ||
            changedProperties.has("query") ||
            changedProperties.has("config") ||
            changedProperties.has("active")) {
            this.propertyObserver();
        }
    }

    propertyObserver() {
        // With each property change we must updated config and create the columns again. No extra checks are needed.
        this._config = Object.assign(this.getDefaultConfig(), this.config);
        this._columns = this._getTableColumns();

        // Config for the grid toolbar
        this.toolbarConfig = {
            columns: this._columns[0]
        };

        this.renderTable();
    }

    renderTable() {
        // If this.individuals is provided as property we render the array directly
        if (this.individuals && this.individuals.length > 0) {
            this.renderLocalTable();
        } else {
            this.renderRemoteTable();
        }
    }

    renderRemoteTable() {
        if (!this.active) {
            return;
        }

        // Initialise row counters
        this.from = 1;
        this.to = this._config.pageSize;

        if (this.opencgaSession.opencgaClient && this.opencgaSession.study && this.opencgaSession.study.fqn) {
            const filters = Object.assign({}, this.query);
            // filters.study = this.opencgaSession.study.fqn;
            if (UtilsNew.isNotUndefinedOrNull(this.lastFilters) &&
                JSON.stringify(this.lastFilters) === JSON.stringify(filters)) {
                // Abort destroying and creating again the grid. The filters have not changed
                return;
            }
            // Store the current filters
            this.lastFilters = {...filters};

            // Make a copy of the individuals (if they exist), we will use this private copy until it is assigned to this.individuals
            // if (UtilsNew.isNotUndefined(this.individuals)) {
            //     this._individuals = this.individuals;
            // } else {
            //     this._individuals = [];
            // }

            this.table = $("#" + this.gridId);
            const _this = this;
            this.table.bootstrapTable("destroy");
            this.table.bootstrapTable({
                columns: _this._getTableColumns(),
                method: "get",
                sidePagination: "server",
                uniqueId: "id",

                // Table properties
                pagination: _this._config.pagination,
                pageSize: _this._config.pageSize,
                pageList: _this._config.pageList,
                showExport: _this._config.showExport,
                detailView: _this._config.detailView,
                detailFormatter: _this._config.detailFormatter,

                gridContext: _this,
                formatLoadingMessage: () =>"<div><loading-spinner></loading-spinner></div>",

                ajax: params => {
                    const _filters = {
                        study: this.opencgaSession.study.fqn,
                        // order: params.data.order,
                        limit: params.data.limit,
                        skip: params.data.offset || 0,
                        count: !_this.table.bootstrapTable("getOptions").pageNumber || _this.table.bootstrapTable("getOptions").pageNumber === 1,
                        ...filters
                    };
                    this.opencgaSession.opencgaClient.individuals().search(_filters)
                        .then( res => params.success(res))
                        .catch( e => console.error(e));
                },
                responseHandler: response => {
                    const result = this.gridCommons.responseHandler(response, $(this.table).bootstrapTable("getOptions"));
                    this.from = result.from || this.from;
                    this.to = result.to || this.to;
                    this.numTotalResultsText = result.numTotalResultsText || this.numTotalResultsText;
                    this.approximateCountResult = result.approximateCountResult;
                    this.requestUpdate();
                    return result.response;
                },
                onClickRow: (row, selectedElement, field) => this.gridCommons.onClickRow(row.id, row, selectedElement),
                onDblClickRow: function(row, element, field) {
                    // We detail view is active we expand the row automatically.
                    // FIXME: Note that we use a CSS class way of knowing if the row is expand or collapse, this is not ideal but works.
                    if (_this._config.detailView) {
                        if (element[0].innerHTML.includes("icon-plus")) {
                            $("#" + _this.gridId).bootstrapTable("expandRow", element[0].dataset.index);
                        } else {
                            $("#" + _this.gridId).bootstrapTable("collapseRow", element[0].dataset.index);
                        }
                    }
                },
                onCheck: (row, $element) => {
                    this.checkedRows.set(row.id, row);
                    this.gridCommons.onCheck(row.id, row, {rows: Array.from(this.checkedRows.values())});
                },
                onCheckAll: rows => {
                    for (let row of rows) {
                        this.checkedRows.set(row.id, row);
                    }
                    this.gridCommons.onCheckAll(rows, {rows: Array.from(this.checkedRows.values())});
                },
                onUncheck: (row, $element) => {
                    this.checkedRows.delete(row.id);
                    this.gridCommons.onUncheck(row.id, row, {rows: Array.from(this.checkedRows.values())});
                },
                onUncheckAll: rows => {
                    for (let row of rows) {
                        this.checkedRows.delete(row.id);
                    }
                    this.gridCommons.onCheckAll(rows, {rows: Array.from(this.checkedRows.values())});
                },
                onLoadSuccess: data => {
                    for (let i = 0; i < data.rows.length; i++) {
                        if (this.checkedRows.has(data.rows[i].id)) {
                            $(this.table).bootstrapTable('check', i);
                        }
                    }
                    this.gridCommons.onLoadSuccess(data, 1);
                },
                // onLoadSuccess: data => this.gridCommons.onLoadSuccess(data, 1),
                onPageChange: function(page, size) {
                    _this.from = (page - 1) * size + 1;
                    _this.to = page * size;
                },
                onPostBody: function(data) {
                    // Add tooltips
                    _this.catalogUiUtils.addTooltip("div.phenotypesTooltip", "Phenotypes");
                }
            });
        }
    }

    renderLocalTable() {
        this.from = 1;
        this.to = Math.min(this.individuals.length, this._config.pageSize);
        this.numTotalResultsText = this.individuals.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        const _this = this;
        this.table = $("#" + this.gridId);
        this.table.bootstrapTable("destroy");
        this.table.bootstrapTable({
            data: _this.individuals,
            columns: _this._createDefaultColumns(),
            sidePagination: "local",

            // Set table properties, these are read from config property
            uniqueId: "id",
            pagination: _this._config.pagination,
            pageSize: _this._config.pageSize,
            pageList: _this._config.pageList,
            showExport: _this._config.showExport,
            detailView: _this._config.detailView,
            detailFormatter: _this.detailFormatter,
            formatLoadingMessage: () =>"<div><loading-spinner></loading-spinner></div>",

            onClickRow: (row, selectedElement, field) => this.gridCommons.onClickRow(row.id, row, selectedElement),
            onPageChange: function(page, size) {
                // _this.from = (page - 1) * size + 1;
                // _this.to = page * size;
            },
            onPostBody: function(data) {
                // We call onLoadSuccess to select first row
                _this.gridCommons.onLoadSuccess({rows: data, total: data.length}, 2);
                _this.catalogUiUtils.addTooltip("div.phenotypesTooltip", "Phenotypes");
            }
        });
    }

    // _onSelectIndividual(row, event) {
    //     console.log("row, event", row, event);
    //     if (UtilsNew.isNotUndefinedOrNull(row)) {
    //         if (UtilsNew.isUndefinedOrNull(event) || event !== "onLoad") {
    //             this.dispatchEvent(new CustomEvent("selectindividual", {
    //                 detail: {
    //                     id: row.id,
    //                     individual: row
    //                 }
    //             }));
    //         }
    //     }
    // }

    onColumnChange(e) {
        const table = $("#" + this.gridId);
        if (e.detail.selected) {
            table.bootstrapTable("showColumn", e.detail.id);
        } else {
            table.bootstrapTable("hideColumn", e.detail.id);
        }
    }

    //TODO lit-html refactor
    detailFormatter(value, row) {
        let result = `<div class='row' style="padding: 5px 10px 20px 10px">
                                <div class='col-md-12'>
                                    <h5 style="font-weight: bold">Samples</h5>
                `;

        if (UtilsNew.isNotEmptyArray(row.samples)) {
            let tableCheckboxHeader = "";

            if (this.gridContext._config.multiSelection) {
                tableCheckboxHeader = "<th>Select</th>";
            }

            result += `<div style="width: 90%;padding-left: 20px">
                                <table class="table table-hover table-no-bordered">
                                    <thead>
                                        <tr class="table-header">
                                            ${tableCheckboxHeader}
                                            <th>Sample ID</th>
                                            <th>Source</th>
                                            <th>Collection Method</th>
                                            <th>Preparation Method</th>
                                            <th>Somatic</th>
                                            <th>Creation Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>`;

            for (const sample of row.samples) {
                let tableCheckboxRow = "";
                // If parent row is checked and there is only one samlpe then it must be selected
                if (this.gridContext._config.multiSelection) {
                    let checkedStr = "";
                    for (const individual of this.gridContext.individuals) {
                        if (individual.id === row.id && row.samples.length === 1) {
                            // TODO check sampkle has been checked before, we need to store them
                            checkedStr = "checked";
                            break;
                        }
                    }

                    tableCheckboxRow = `<td><input id='${this.gridContext.prefix}${sample.id}Checkbox' type='checkbox' ${checkedStr}></td>`;
                }

                const source = (UtilsNew.isNotEmpty(sample.source)) ? sample.source : "-";
                const collectionMethod = (sample.collection !== undefined) ? sample.collection.method : "-";
                const preparationMethod = (sample.processing !== undefined) ? sample.processing.preparationMethod : "-";
                const cellLine = (sample.somatic) ? "Somatic" : "Germline";
                const creationDate = moment(sample.creationDate, "YYYYMMDDHHmmss").format("D MMM YYYY");

                result += `<tr class="detail-view-row">
                                        ${tableCheckboxRow}
                                        <td>${sample.id}</td>
                                        <td>${source}</td>
                                        <td>${collectionMethod}</td>
                                        <td>${preparationMethod}</td>
                                        <td>${cellLine}</td>
                                        <td>${creationDate}</td>
                                        <td>${sample.status ? sample.status.name : ""}</td>
                                   </tr>`;
            }
            result += "</tbody></table></diV>";
        } else {
            result += "No samples found";
        }

        result += "</div></div>";
        return result;
    }

    sexFormatter(value, row) {
        let sexHtml = `<span>${row.sex}</span>`;
        if (UtilsNew.isNotEmpty(row.karyotypicSex)) {
            sexHtml += ` (${row.karyotypicSex})`;
        }
        return sexHtml;
    }

    fatherFormatter(value, row) {
        if (UtilsNew.isNotUndefinedOrNull(row.father) && UtilsNew.isNotEmpty(row.father.id)) {
            return row.father.id;
        } else {
            return "-";
        }
    }

    motherFormatter(value, row) {
        if (UtilsNew.isNotUndefinedOrNull(row.mother) && UtilsNew.isNotEmpty(row.mother.id)) {
            return row.mother.id;
        } else {
            return "-";
        }
    }

    disordersFormatter(value, row) {
        debugger
        if (value) {
            let disordersHtml = "<div>";
            for (const disorder of value) {
                if (disorder.id.startsWith("OMIM")) {
                    disordersHtml += `<span><a href="https://omim.org/entry/${disorder.id.replace("OMIM:", "")}" target="_blank">${disorder.id}</a></span>`;
                } else {
                    disordersHtml += `<span>${disorder.id}</span>`;
                }
            }
            disordersHtml += "</div>";
            return disordersHtml;
        } else {
            return "-";
        }
    }

    phenotypesFormatter(value, row) {
        if (UtilsNew.isNotEmptyArray(value)) {
            let phenotypeTooltipText = "";
            for (const phenotype of value) {
                phenotypeTooltipText += "<div style=\"padding: 5px\">";
                if (UtilsNew.isNotUndefinedOrNull(phenotype.source) && phenotype.source.toUpperCase() === "HPO") {
                    phenotypeTooltipText += `<span><a target="_blank" href="https://hpo.jax.org/app/browse/term/${phenotype.id}">${phenotype.id} </a>(${phenotype.status})</span>`;
                } else {
                    phenotypeTooltipText += `<span>${phenotype.id} (${phenotype.status})</span>`;
                }
                phenotypeTooltipText += "</div>";
            }

            const html = `<div class="phenotypesTooltip" data-tooltip-text='${phenotypeTooltipText}' align="center">
                                    <a style="cursor: pointer">
                                        ${value.length} terms found
                                    </a>
                                </div>
                    `;
            return html;
        } else {
            return "-";
        }
    }

    samplesFormatter(value, row) {
        if (UtilsNew.isNotEmptyArray(row.samples)) {
            let samples = "<div>";
            for (const sample of row.samples) {
                samples += `<div>${sample.id}</div>`;
            }
            samples += "</div>";
            return samples;
        } else {
            return "-";
        }
    }

    customAnnotationFormatter(value, row) {
        // debugger
    }

    dateFormatter(value, row) {
        if (UtilsNew.isNotUndefinedOrNull(value)) {
            return moment(value, "YYYYMMDDHHmmss").format("D MMM YYYY");
        }
        return "-";
    }

    _getTableColumns() {
        // Check column visibility
        const customAnnotationVisible = (UtilsNew.isNotUndefinedOrNull(this._config.customAnnotations) &&
            UtilsNew.isNotEmptyArray(this._config.customAnnotations.fields));

        let _columns = [
            {
                title: "Individual",
                field: "id",
                sortable: true,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Samples",
                field: "samples",
                formatter: this.samplesFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Father",
                field: "father.id",
                formatter: this.fatherFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Mother",
                field: "mother.id",
                formatter: this.motherFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Phenotypes",
                field: "phenotypes",
                formatter: this.phenotypesFormatter.bind(this),
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Disorders",
                field: "disorders",
                formatter: this.disordersFormatter.bind(this),
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Sex",
                field: "sex",
                sortable: true,
                formatter: this.sexFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Life Status",
                field: "lifeStatus",
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Custom Annotations",
                field: "customAnnotation",
                formatter: this.customAnnotationFormatter,
                visible: customAnnotationVisible,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Date of Birth",
                field: "dateOfBirth",
                sortable: true,
                formatter: this.dateFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Creation Date",
                field: "creationDate",
                sortable: true,
                formatter: this.dateFormatter,
                halign: this._config.header.horizontalAlign
            },
            {
                title: "Status",
                field: "status.name",
                halign: this._config.header.horizontalAlign
            }
        ];

        if (this._config.showSelectCheckbox) {
            _columns.push({
                field: "state",
                checkbox: true,
                // formatter: this.stateFormatter,
                class: "cursor-pointer",
                eligible: false
            });
        }

        return _columns;
    }

    onDownload(e) {
        // let urlQueryParams = this._getUrlQueryParams();
        // let params = urlQueryParams.queryParams;
        // console.log(this.opencgaSession);
        const params = {
            ...this.query,
            study: this.opencgaSession.study.fqn,
            sid: this.opencgaSession.opencgaClient._config.sessionId,
            limit: 1000,
            skip: 0,
            includeIndividual: true,
            count: false

        };

        this.opencgaSession.opencgaClient.individuals().search(params)
            .then(response => {
                const result = response.response[0].result;
                console.log(result);
                let dataString = [];
                let mimeType = "";
                let extension = "";
                if (result) {
                    // Check if user clicked in Tab or JSON format
                    if (e.detail.option.toLowerCase() === "tab") {
                        dataString = [
                            ["Individual", "Samples", "Sex", "Father", "Mother", "Disorders", "Phenotypes", "Life Status", "Date of Birth", "Creation Date", "Status"].join("\t"),
                            ...result.map( _ => [
                                _.id,
                                _.samples ? _.samples.map( _ => _.id).join(",") : "",
                                _.sex,
                                _.father.id,
                                _.mother.id,
                                _.disorders ? _.disorders.map( _ => _.id).join(",") : "",
                                _.phenotypes ? _.phenotypes.map( _ => _.id).join(",") : "",
                                _.lifeStatus,
                                _.dateOfBirth,
                                _.creationDate,
                                _.status.name
                            ].join("\t"))];
                        // console.log(dataString);
                        mimeType = "text/plain";
                        extension = ".txt";
                    } else {
                        for (const res of result) {
                            dataString.push(JSON.stringify(res, null, "\t"));
                        }
                        mimeType = "application/json";
                        extension = ".json";
                    }

                    // Build file and anchor link
                    const data = new Blob([dataString.join("\n")], {type: mimeType});
                    const file = window.URL.createObjectURL(data);
                    const a = document.createElement("a");
                    a.href = file;
                    a.download = this.opencgaSession.study.alias + extension;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function() {
                        document.body.removeChild(a);
                    }, 0);
                } else {
                    console.error("Error in result format");
                }
            })
            .then(function() {
                // this.downloadRefreshIcon.css("display", "none");
                // this.downloadIcon.css("display", "inline-block");
            });
    }

    getDefaultConfig() {
        return {
            pagination: true,
            pageSize: 10,
            pageList: [10, 25, 50],
            showExport: false,
            detailView: true,
            detailFormatter: this.detailFormatter, // function with the detail formatter
            multiSelection: false,
            showSelectCheckbox: true,
            header: {
                horizontalAlign: "center",
                verticalAlign: "bottom"
            },
            disorderSources: ["ICD", "ICD10", "GelDisorder"],
            customAnnotations: {
                title: "Custom Annotation",
                fields: []
            }
        };
    }


    render() {
        return html`
            <style>
                .detail-view :hover {
                    background-color: white;
                }
    
                .detail-view-row :hover {
                    background-color: #f5f5f5;
                }
    
                .cursor-pointer {
                    cursor: pointer;
                }
    
                .phenotypes-link-dropdown:hover .dropdown-menu {
                    display: block;
                }
            </style>
    
            <opencb-grid-toolbar .from="${this.from}"
                                 .to="${this.to}"
                                 .numTotalResultsText="${this.numTotalResultsText}"
                                 .config="${this.toolbarConfig}"
                                 @download="${this.onDownload}"
                                 @columnchange="${this.onColumnChange}">
            </opencb-grid-toolbar>
    
            <div id="${this._prefix}GridTableDiv">
                <table id="${this._prefix}IndividualBrowserGrid"></table>
            </div>
        `;
    }

}

customElements.define("opencga-individual-grid", OpencgaIndividualGrid);