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
import "../commons/opencb-grid-toolbar.js";
import "../../loading-spinner.js";


// todo check functionality and notify usage

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
            //TODO check what's the point   ==> This seems a copy/past from file-grid, it should be 'jobs' to render locally
            files: {
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
        this.table = this.querySelector("#" + this.gridId);
        this.query = {};
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") || changedProperties.has("query")) {
            this.renderTable();
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

    configObserver() {
        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    renderTable() {
        this.files = [];
        this.from = 1;
        this.to = 10;

        if (UtilsNew.isNotUndefined(this.opencgaSession.opencgaClient) &&
            UtilsNew.isNotUndefined(this.opencgaSession.study) &&
            UtilsNew.isNotUndefined(this.opencgaSession.study.fqn)) {
            // Make a copy of the files (if they exist), we will use this private copy until it is assigned to this.files
            if (UtilsNew.isNotUndefined(this.files)) {
                this._files = this.files;
            } else {
                this._files = [];
            }

            const _this = this;
            $(this.table).bootstrapTable("destroy");
            $(this.table).bootstrapTable({
                // url: opencgaHostUrl,
                columns: _this._columns,
                method: "get",
                sidePagination: "server",
                uniqueId: "id",

                // Table properties
                pagination: this._config.pagination,
                pageSize: this._config.pageSize,
                pageList: this._config.pageList,
                showExport: this._config.showExport,
                detailView: this._config.detailView,
                detailFormatter: this._config.detailFormatter.bind(this),
                formatLoadingMessage: () =>"<div><loading-spinner></loading-spinner></div>",

                ajax: params => {
                    const filters = {
                        study: this.opencgaSession.study.fqn,
                        deleted: false,
                        count: !$(this.table).bootstrapTable("getOptions").pageNumber || $(this.table).bootstrapTable("getOptions").pageNumber === 1,
                        order: params.data.order,
                        limit: params.data.limit || $(this.table).bootstrapTable("getOptions").pageSize,
                        skip: params.data.offset || 0,
                        include: "id,userId,tool,priority,tags,creationDate,visited,dependsOn,outDir,internal,execution,params,input",
                        ...this.query
                    };
                    this.opencgaSession.opencgaClient.jobs().search(filters).then( res => params.success(res));
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
                /*onClickRow: (row, element, field) => {
                    if (this._config.multiselection) {
                        $(element).toggleClass("success");
                        const index = element[0].getAttribute("data-index");
                        // Check and uncheck actions trigger events that are captured below
                        if ("selected" === element[0].className) {
                            this.table.bootstrapTable("uncheck", index);
                        } else {
                            this.table.bootstrapTable("check", index);
                        }
                    } else {
                        $(".success").removeClass("success");
                        $(element).addClass("success");
                    }

                    this.dispatchEvent(new CustomEvent("clickRow", {detail: {resource: "job", data: row}}));
                    //_this._onSelectFile(row);
                },*/
                onCheck: function(row, elem) {
                    // check file is not already selected
                    for (const i in _this._files) {
                        if (_this._files[i].id === row.id) {
                            return;
                        }
                    }

                    // we add files to selected files
                    _this._files.push(row);
                    _this.files = _this._files.slice();
                },
                onUncheck: function(row, elem) {
                    let fileToDeleteIdx = -1;
                    for (const i in _this.files) {
                        if (_this.files[i].id === row.id) {
                            fileToDeleteIdx = i;
                            break;
                        }
                    }

                    if (fileToDeleteIdx === -1) {
                        return;
                    }

                    // _this.splice("_files", fileToDeleteIdx, 1);
                    // _this.set("files", _this._files.slice());
                    _this._files.splice(fileToDeleteIdx, 1);
                    _this.files = _this._files.slice();
                },
                onCheckAll: function(rows) {
                    const newFiles = _this._files.slice();
                    // check file is not already selected
                    rows.forEach(file => {
                        const existsNewSelected = _this._files.some(fileSelected => {
                            return fileSelected.id === file.id;
                        });

                        if (!existsNewSelected) {
                            newFiles.push(file);
                        }
                    });

                    // we add files to selected files
                    _this._files = newFiles;
                    _this.files = newFiles.slice();

                },
                onUncheckAll: function(rows) {
                    // check file is not already selected
                    rows.forEach(file => {
                        _this._files = _this._files.filter(fileSelected => {
                            return fileSelected.id !== file.id;
                        });

                    });

                    // we add files to selected files
                    //                            _this.push("_files", row);
                    _this.files = _this._files.slice();

                },
                onLoadSuccess: data => this.gridCommons.onLoadSuccess(data, 1),
                /*onLoadSuccess: function(data) {
                    console.log("onLoadSuccess")
                    // Check all already selected rows. Selected files are stored in this.files array
                    if (UtilsNew.isNotUndefinedOrNull(this.table)) {
                        if (!_this._config.multiselection) {
                            PolymerUtils.querySelector(this.table.selector).rows[1].setAttribute("class", "success");
                            _this._onSelectFile(data.rows[0]);
                        }

                        if (_this.files !== "undefined") {
                            for (const idx in _this.files) {
                                for (const j in data.rows) {
                                    if (_this.files[idx].id === data.rows[j].id) {
                                        this.table.bootstrapTable("check", j);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                },*/
                onPageChange: (page, size) => this.gridCommons.onPageChange(page, size)
            });
        } else {
            // Delete table
            this.table.bootstrapTable("destroy");
            this.numTotalResults = 0;
        }
    }

    getDefaultConfig() {
        return {
            pagination: true,
            pageSize: 10,
            pageList: [10, 25, 50],
            showExport: false,
            detailView: true,
            detailFormatter: this.detailFormatter,

            showSelectCheckbox: false,
            multiSelection: false,
            nucleotideGenotype: true,
            alleleStringLengthMax: 15,

            header: {
                horizontalAlign: "center",
                verticalAlign: "bottom"
            }
        };
    }

    /**
     * If filters have been removed, clean the values from the forms.
     */
    onFilterUpdate() {
        // this.updateForms(this.filters); //TODO recheck, this shouldn't be necessary anymore (and it seems not)
    }

    _onSelectFile(row) {
        if (typeof row !== "undefined") {
            this.dispatchEvent(new CustomEvent("selectfile", {detail: {id: row.id, file: row}}));
        }
    }

    // TODO adapct to jobs
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
    }

    _initTableColumns() {
        const columns = [];
        /* if (this._config.multiselection) {
            columns.push({
                field: {source: "state", context: this},
                checkbox: true,
                formatter: this.stateFormatter
            });
        }*/

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
                formatter: this.statusFormatter
            },
            {
                title: "Creation",
                field: "creationDate",
                formatter: this.creationDateFormatter
            },
            {
                title: "Priority",
                field: "priority"
            },
            {
                title: "Tags",
                field: "tags",
                formatter: v => v && v.length ? v.map( tag => `<span class="badge badge-secondary">${tag}</span>`).join(" ") : "-"
            },
            {
                title: "Running time",
                field: "execution",
                formatter: execution => {
                    const pad2 = int => int.toString().padStart(2, "0");
                    if (execution?.start) {
                        const duration = moment.duration((execution.end ? execution.end : moment().valueOf()) - execution.start)
                        const [seconds, minutes, hours] = [duration.seconds(), duration.minutes(), duration.hours()];
                        if (hours > 0) {
                            return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
                        }
                        if (minutes > 0) {
                            return `${pad2(minutes)}:${pad2(seconds)}`;
                        }
                        return `00:${pad2(seconds)}`;
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
                title: "Depends on",
                field: "dependsOn",
                formatter: v => v.length > 0 ?
                    `<div class="tooltip-div">
                            <a tooltip-title="Dependencies" tooltip-text="${v.map(job => `<p>${job.id}</p>`).join("<br>")}"> ${v.length} job${v.length > 1 ? "s" : ""}</a>
                    </div>
                    ` : "-"
            },
            {
                title: "Visited",
                field: "visited"
            }
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
                                                            <td>${this.statusFormatter(job.internal.status.name)}</td>
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

    creationDateFormatter(date) {
        //return moment(date, "YYYYMMDDHHmmss").format("D MMM YYYY, h:mm:ss a")
        return `<a tooltip-title="Creation date"  tooltip-text="${moment(date, "YYYYMMDDHHmmss").format("D MMM YYYY, h:mm:ss a")}"> ${moment(date, "YYYYMMDDHHmmss").fromNow()} </a>`
    }

    statusFormatter(status) {
        switch (status) {
            case "PENDING":
            case "QUEUED":
            case "REGISTERING":
            case "UNREGISTERED":
                return `<span class="text-primary"><i class="far fa-clock"></i> ${status}</span>`
            case "RUNNING":
                return `<span class="text-primary"><i class="fas fa-sync-alt anim-rotate"></i> ${status}</span>`
            case "DONE":
                return `<span class="text-success"><i class="fas fa-check-circle"></i> ${status}</span>`
            case "ERROR":
                return `<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ${status}</span>`;
            case "UNKNOWN":
                return `<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ${status}</span>`;
            case "ABORTED":
                return `<span class="text-warning"><i class="fas fa-ban"></i> ${status}</span>`;
            case "DELETED":
                return `<span class="text-primary"><i class="fas fa-trash-alt"></i> ${status}</span>`;
        }
        return "-";
        // return {
        //     "PENDING": `<span class="text-primary"><i class="far fa-clock"></i> ${status}</span>`,
        //     "QUEUED": `<span class="text-primary"><span class=""> <i class="far fa-clock"></i> ${status}</span>`,
        //     "RUNNING": `<span class="text-primary"><i class="fas fa-sync-alt anim-rotate"></i> ${status}</span>`,
        //     "DONE": `<span class="text-success"><i class="fas fa-check-circle"></i> ${status}</span>`,
        //     "ERROR": `<span class="text-danger"><i class="fas fa-exclamation-circle"></i> ${status}</span>`,
        //     "UNKNOWN": `<span class="text-warning"><i class="fas fa-question-circle"></i> ${status}</span>`,
        //     "REGISTERING": `<span class="text-info"><i class="far fa-clock"></i> ${status}</span>`,
        //     "UNREGISTERED": `<span class="text-muted"><i class="far fa-clock"></i> ${status}</span>`,
        //     "ABORTED": `<span class="text-warning"><i class="fas fa-ban"></i> ${status}</span>`,
        //     "DELETED": `<span class="text-primary"><i class="fas fa-trash-alt"></i> ${status}</span>`
        // }[status];
    }

    onDownload(e) {
        // let params = urlQueryParams.queryParams;
        const filters = {
            limit: 1000,
            //sid: this.opencgaSession.opencgaClient._config.sessionId,
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
                            ...result.map( _ => [
                                _.id,
                                _.tool.id,
                                _.priority,
                                _.tags,
                                _.creationDate,
                                _["internal.status.name"],
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

    render() {
        return html`
            <opencb-grid-toolbar .from="${this.from}"
                                .to="${this.to}"
                                .numTotalResultsText="${this.numTotalResultsText}"
                                @download="${this.onDownload}">
            </opencb-grid-toolbar>
            <div>
                <table id="${this.gridId}"></table>
            </div>
        `;
    }

}

customElements.define("opencga-jobs-grid", OpencgaJobsGrid);