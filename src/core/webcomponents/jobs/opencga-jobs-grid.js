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
import GridCommons from "../variant/grid-commons.js";
import CatalogGridFormatter from "../commons/catalog-grid-formatter.js";
import "../commons/opencb-grid-toolbar.js";
import "../loading-spinner.js";


export default class OpencgaJobsGrid extends LitElement {

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
            jobs: {
                type: Array
            },
            filters: {
                type: Object
            },
            query: {
                type: Object
            },
            // TODO check do we really need it..
            eventNotifyName: {
                type: String
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "jbgrid" + UtilsNew.randomString(6) + "_";
        this.eventNotifyName = "messageevent";
        this.gridId = this._prefix + "JobBrowserGrid";
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
        this.gridCommons = new GridCommons(this.gridId, this, this._config);
    }

    firstUpdated(_changedProperties) {
        this._initTableColumns();
        this.dispatchEvent(new CustomEvent("clear", {detail: {}, bubbles: true, composed: true}));
        this.table = $("#" + this.gridId);
        this.query = {};
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") || changedProperties.has("query")) {
            this.propertyObserver();
        }
        if (changedProperties.has("filters")) {
            this.onFilterUpdate();
        }
        if (changedProperties.has("config")) {
            this.configObserver();
        }

        if (changedProperties.has("filteredVariables")) {
            //this.calculateFilters(); // TODO whats this?
        }
    }

    propertyObserver() {
        this.catalogGridFormatter = new CatalogGridFormatter(this.opencgaSession);

        this.toolbarConfig = {
            columns: this._initTableColumns().filter(col => col.field)
        };
        this.renderTable();
    }

    configObserver() {
        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    onColumnChange(e) {
        this.gridCommons.onColumnChange(e);
    }

    renderTable() {
        this.jobs = [];

        if (UtilsNew.isNotUndefined(this.opencgaSession.opencgaClient) &&
            UtilsNew.isNotUndefined(this.opencgaSession.study) &&
            UtilsNew.isNotUndefined(this.opencgaSession.study.fqn)) {
            // Make a copy of the jobs (if they exist), we will use this private copy until it is assigned to this.jobs
            if (UtilsNew.isNotUndefined(this.jobs)) {
                this._jobs = this.jobs;
            } else {
                this._jobs = [];
            }

            const _this = this;
            this.table = $("#" + this.gridId);

            this.table.bootstrapTable("destroy");
            this.table.bootstrapTable({
                // url: opencgaHostUrl,
                columns: _this._columns,
                method: "get",
                sidePagination: "server",
                uniqueId: "id",
                // Table properties
                pagination: this._config.pagination,
                pageSize: this._config.pageSize,
                pageList: this._config.pageList,
                paginationVAlign: "both",
                formatShowingRows: this.gridCommons.formatShowingRows,
                showExport: this._config.showExport,
                detailView: this._config.detailView,
                detailFormatter: this._config.detailFormatter.bind(this),
                sortName: "Creation",
                sortOrder: "asc",
                order: "AAA",
                formatLoadingMessage: () => "<div><loading-spinner></loading-spinner></div>",
                ajax: params => {
                    const filters = {
                        study: this.opencgaSession.study.fqn,
                        deleted: false,
                        count: !this.table.bootstrapTable("getOptions").pageNumber || this.table.bootstrapTable("getOptions").pageNumber === 1,
                        sort: "creationDate",
                        order: -1,
                        limit: params.data.limit || this.table.bootstrapTable("getOptions").pageSize,
                        skip: params.data.offset || 0,
                        include: "id,userId,tool,priority,tags,creationDate,visited,dependsOn,outDir,internal,execution,params,input,output",
                        ...this.query
                    };
                    this.opencgaSession.opencgaClient.jobs().search(filters)
                        .then(res => params.success(res))
                        .catch(e => {
                            console.error(e);
                            params.error(e);
                        });
                },
                responseHandler: response => {
                    const result = this.gridCommons.responseHandler(response, this.table.bootstrapTable("getOptions"));
                    return result.response;
                },
                onClickRow: (row, selectedElement, field) => this.gridCommons.onClickRow(row.id, row, selectedElement),
                onDblClickRow: (row, element, field) => {
                    // We detail view is active we expand the row automatically.
                    // FIXME: Note that we use a CSS class way of knowing if the row is expand or collapse, this is not ideal but works.
                    if (this._config.detailView) {
                        if (element[0].innerHTML.includes("icon-plus")) {
                            this.table.bootstrapTable("expandRow", element[0].dataset.index);
                        } else {
                            this.table.bootstrapTable("collapseRow", element[0].dataset.index);
                        }
                    }
                },
                onCheck: (row, $element) => {
                    this.gridCommons.onCheck(row.id, row);
                },
                onCheckAll: rows => {
                    this.gridCommons.onCheckAll(rows);
                },
                onUncheck: (row, $element) => {
                    this.gridCommons.onUncheck(row.id, row);
                },
                onUncheckAll: rows => {
                    this.gridCommons.onUncheckAll(rows);
                },
                onLoadSuccess: data => {
                    this.gridCommons.onLoadSuccess(data, 1);
                },
                onLoadError: (e, restResponse) => this.gridCommons.onLoadError(e, restResponse),
            });
        } else {
            // Delete table
            this.table.bootstrapTable("destroy");
            this.numTotalResults = 0;
        }
    }

    /*/!**
     * If filters have been removed, clean the values from the forms.
     *!/
    onFilterUpdate() {
        this.updateForms(this.filters); //TODO recheck, this shouldn't be necessary anymore (and it seems not)
    }*/

    /*// TODO adapt to jobs
    onSearch() {
        // Convert the filters to an objectParam that can be directly send to the file search
        const filterParams = {};

        const keys = Object.keys(this.filters);
        for (let i = 0; i < keys.length; i++) {
            // Some filters can come as an array of things.
            // annotation = [{name: name, value: Smith}, {name: age, value: >5}]
            if (Array.isArray(this.filters[keys[i]])) {
                const myArray = this.filters[keys[i]];

                let myArrayFilter = [];

                // The elements in the array can be either an object
                if (Object.getPrototypeOf(myArray[0]) === Object.prototype) {
                    const myArray = this.filters[keys[i]];
                    for (let j = 0; j < myArray.length; j++) {
                        // TODO: We have to check if the value already has an operand
                        myArrayFilter.push(myArray[j].name + "=" + myArray[j].value);
                    }
                } else {
                    // Or an array of strings or numbers
                    myArrayFilter = this.filters[keys[i]];
                }

                filterParams[keys[i]] = myArrayFilter.join(";");
            } else {
                filterParams[keys[i]] = this.filters[keys[i]];
            }
        }

        if (this.filters.hasOwnProperty("annotation")) {
            // Add the variable set whose annotations will be queried
            filterParams["variableSetId"] = this.filteredVariables.variableSet;
        }
        this.query = filterParams;
    }*/

    _initTableColumns() {
        this._columns = [
            // name,path,samples,status,format,bioformat,creationDate,modificationDate,uuid"
            {
                title: "Job ID",
                field: "id"
            },
            {
                title: "Analysis Tool ID",
                field: "tool.id"
            },
            {
                title: "Status",
                field: "internal.status.name",
                formatter: status => UtilsNew.jobStatusFormatter(status)
            },

            {
                title: "Priority",
                field: "priority"
            },
            {
                title: "Depends on",
                field: "dependsOn",
                formatter: v => v.length > 0 ?
                    `<div class="tooltip-div">
                            <a tooltip-title="Dependencies" tooltip-text="${v.map(job => `<p>${job.id}</p>`).join("<br>")}"> ${v.length} job${v.length > 1 ? "s" : ""}</a>
                    </div>
                    ` : "-"
            },
            {
                title: "Output Files",
                field: "output",
                formatter: (value) => {
                    let fileIds = value?.map(file => file.name);
                    return this.catalogGridFormatter.fileFormatter(fileIds);
                }
            },
            // {
            //     title: "Tags",
            //     field: "tags",
            //     formatter: v => v && v.length ? v.map( tag => `<span class="badge badge-secondary">${tag}</span>`).join(" ") : "-"
            // },
            {
                title: "Runtime",
                field: "execution",
                formatter: execution => {
                    if (execution?.start) {
                        const duration = moment.duration((execution.end ? execution.end : moment().valueOf()) - execution.start);
                        const f = moment.utc(duration.asMilliseconds()).format("HH:mm:ss")
                        return `<a tooltip-title="Runtime"  tooltip-text="${f}"> ${duration.humanize()} </a>`
                    }
                }

            },
            {
                title: "Start/End Date",
                field: "execution",
                formatter: execution => execution?.start
                    ? moment(execution.start).format("D MMM YYYY, h:mm:ss a") + " / " + (execution?.end ? moment(execution.end).format("D MMM YYYY, h:mm:ss a") : "-")
                    : "-"
            },
            {
                title: "Creation Date",
                field: "creationDate",
                formatter: this.catalogGridFormatter.dateFormatter
            },
            // {
            //     title: "Visited",
            //     field: "visited"
            // }
        ];

        return this._columns;
    }

    detailFormatter(value, row) {
        let result = "<div class='row' style='padding-bottom: 20px'>";
        let detailHtml = "";

        if (row) {
            // Job Dependencies section
            detailHtml = "<div style='padding: 10px 0px 10px 25px'><h4>Job Dependencies</h4></div>";
            detailHtml += "<div style='padding: 5px 40px'>";
            if (row.dependsOn && row.dependsOn.length > 0) {
                detailHtml += ` <div class='row' style="padding: 5px 10px 20px 10px">
                                    <div class='col-md-12'>
                                        <div>
                                            <table class="table table-hover table-no-bordered">
                                                <thead>
                                                    <tr class="table-header">
                                                        <th>ID</th>
                                                        <th>Tool</th>
                                                        <th>Status</th>
                                                        <th>Priority</th>
                                                        <th>Creation Date</th>
                                                        <th>Visited</th>
                                                    </tr>
                                                </thead>                    
                                                <tbody>
                                                    ${row.dependsOn.map(job => `
                                                        <tr class="detail-view-row">
                                                            <td>${job.id}</td>
                                                            <td>${job.tool.id}</td>
                                                            <td>${UtilsNew.jobStatusFormatter(job.internal.status.name)}</td>
                                                            <td>${job.priority}</td>
                                                            <td>${moment(job.creationDate, "YYYYMMDDHHmmss").format("D MMM YYYY, h:mm:ss a")}</td>
                                                            <td>${job.visited}</td>
                                                       </tr>
                                                    `).join("")}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>`;
            } else {
                detailHtml += "No dependencies";
            }
            detailHtml += "</div>";

            // Input Files section
            detailHtml += "<div style='padding: 10px 0px 10px 25px'><h4>Input Files</h4></div>";
            detailHtml += "<div style='padding: 5px 50px'>";
            detailHtml += "To be implemented";
            detailHtml += "</div>";
        }

        // return row.dependsOn && row.dependsOn.length ? `
        //     <div class='row' style="padding: 5px 10px 20px 10px">
        //         <div class='col-md-12'>
        //             <h5 style="font-weight: bold">Dependencies</h5>
        //             <div>
        //                 <table class="table table-hover table-no-bordered">
        //                     <thead>
        //                         <tr class="table-header">
        //                             <th>ID</th>
        //                             <th>Tool</th>
        //                             <th>Status</th>
        //                             <th>Priority</th>
        //                             <th>Creation Date</th>
        //                             <th>Visited</th>
        //                         </tr>
        //                     </thead>
        //                     <tbody>
        //                         ${row.dependsOn.map(job => `
        //                             <tr class="detail-view-row">
        //                                 <td>${job.id}</td>
        //                                 <td>${job.tool.id}</td>
        //                                 <td>${this.statusFormatter(job.internal.status.name)}</td>
        //                                 <td>${job.priority}</td>
        //                                 <td>${moment(job.creationDate, "YYYYMMDDHHmmss").format("D MMM YYYY, h:mm:ss a")}</td>
        //                                 <td>${job.visited}</td>
        //                            </tr>
        //                         `).join("")}
        //                     </tbody>
        //                 </table>
        //             </div>
        //     </div>
        // </div>` : "No dependencies";

        result += detailHtml + "</div>";
        return result;
    }

    onDownload(e) {
        // let params = urlQueryParams.queryParams;
        const filters = {
            limit: 1000,
            skip: 0,
            count: false,
            study: this.opencgaSession.study.fqn,
            ...this.query
        };
        this.opencgaSession.opencgaClient.jobs().search(filters)
            .then(response => {
                const result = response.getResults();
                let dataString = [];
                let mimeType = "";
                let extension = "";
                if (result) {
                    // Check if user clicked in Tab or JSON format
                    if (e.detail.option.toLowerCase() === "tab") {
                        dataString = [
                            ["Id", "Tool", "Priority", "Tags", "Creation date", "Status", "Visited"].join("\t"),
                            ...result.map(_ => [
                                _.id,
                                _.tool.id,
                                _.priority,
                                _.tags,
                                _.creationDate,
                                _.internal?.status?.name ?? "",
                                _.visited
                            ].join("\t"))];
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
                    a.download = this.opencgaSession.study.alias + "[" + new Date().toISOString() + "]" + extension;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function () {
                        document.body.removeChild(a);
                    }, 0);
                } else {
                    console.error("Error in result format");
                }
            })
            .then(function () {
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
            order: "AAAA",
            detailFormatter: this.detailFormatter,
            showSelectCheckbox: false,
            multiSelection: false,
            nucleotideGenotype: true,
            alleleStringLengthMax: 15,
            showToolbar: true,
            header: {
                horizontalAlign: "center",
                verticalAlign: "bottom"
            }
        };
    }

    render() {
        return html`
            ${this._config.showToolbar ? html`
                <opencb-grid-toolbar .config="${this.toolbarConfig}"
                                    @columnChange="${this.onColumnChange}"
                                    @download="${this.onDownload}">
                </opencb-grid-toolbar>`
            : null}
            <div>
                <table id="${this.gridId}"></table>
            </div>
        `;
    }

}

customElements.define("opencga-jobs-grid", OpencgaJobsGrid);
