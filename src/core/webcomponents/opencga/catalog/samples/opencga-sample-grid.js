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

// TODO check functionality (this.set and this.push has been replaced)
import {LitElement, html} from "/web_modules/lit-element.js";
import "../../../commons/opencb-grid-toolbar.js";

export default class OpencgaSampleGrid extends LitElement {

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
            samples: {
                type: Array
            },
            search: {
                type: Object
            },
            active: {
                type: Boolean
            },
            config: {
                type: Object
            }
        };
    }

    _init() {
        this._prefix = "VarSampleGrid" + Utils.randomString(6) + "_";
        this.active = false;
    }

    updated(changedProperties) {
        if (changedProperties.has("opencgaSession") ||
            changedProperties.has("search") ||
            changedProperties.has("config") ||
            changedProperties.has("active")) {
            this.propertyObserver();
        }
    }

    firstUpdated() {

        this.renderTable(this.active);
        // this.table = PolymerUtils.getElementById(this._prefix + "SampleBrowserGrid");
    }

    propertyObserver() {
        // With each property change we must updated config and create the columns again. No extra checks are needed.
        this._config = Object.assign(this.getDefaultConfig(), this.config);
        this._columns = this._initTableColumns();

        // Config for the grid toolbar
        this.toolbarConfig = {
            columns: this._columns[0]
        };

        this.renderTable(this.active);
    }

    renderTable(active) {
        if (!active) {
            return;
        }

        this.opencgaClient = this.opencgaSession.opencgaClient;

        this.samples = [];

        let filters = Object.assign({}, this.search);

        this.from = 1;
        this.to = 10;

        if (UtilsNew.isNotUndefined(this.opencgaClient) && UtilsNew.isNotUndefined(this.opencgaSession.study) &&
            UtilsNew.isNotUndefined(this.opencgaSession.study.fqn)) {

            filters["study"] = this.opencgaSession.study.fqn;
            if (UtilsNew.isNotUndefinedOrNull(this.lastFilters) &&
                JSON.stringify(this.lastFilters) === JSON.stringify(filters)) {
                // Abort destroying and creating again the grid. The filters have not changed
                return;
            }
            // Store the current filters
            this.lastFilters = Object.assign({}, filters);

            // Make a copy of the samples (if they exist), we will use this private copy until it is assigned to this.samples
            if (UtilsNew.isNotUndefined(this.samples)) {
                this._samples = this.samples;
            } else {
                this._samples = [];
            }

            // Check that HTTP protocol is present and complete the URL
            let opencgaHostUrl = this.opencgaClient.getConfig().host;
            if (!opencgaHostUrl.startsWith("http://") && !opencgaHostUrl.startsWith("https://")) {
                opencgaHostUrl = "http://" + opencgaHostUrl;
            }
            opencgaHostUrl += "/webservices/rest/v1/samples/search";

            let skipCount = false;

            const _table = $("#" + this._prefix + "SampleBrowserGrid");

            const _this = this;
            $("#" + this._prefix + "SampleBrowserGrid").bootstrapTable("destroy");
            $("#" + this._prefix + "SampleBrowserGrid").bootstrapTable({
                url: opencgaHostUrl,
                columns: _this._columns,
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

                queryParams: function(params) {
                    if (this.pageNumber > 1) {
                        skipCount = true;
                    }

                    const auxParams = {
                        sid: Cookies.get(_this.opencgaClient.getConfig().cookieSessionId),
                        order: params.order,
                        sort: params.sort,
                        limit: params.limit,
                        skip: params.offset,
                        includeIndividual: true,
                        skipCount: skipCount
                        // include: "id,source,collection,processing,creationDate,status,type,version,release,individual.id"
                    };

                    if (UtilsNew.isUndefined(filters)) {
                        filters = {};
                    }
                    return Object.assign(filters, auxParams);
                },
                responseHandler: function(response) {
                    if (!skipCount) {
                        if (!_this.hasOwnProperty("numTotalResults")) {
                            _this.numTotalResults = 0;
                        }
                        if (_this.numTotalResults !== response.response[0].numTotalResults &&
                            response.queryOptions.skip === 0) {
                            _this.numTotalResults = response.response[0].numTotalResults;
                        }
                    }

                    _this.numTotalResultsText = _this.numTotalResults.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                    if (response.queryOptions.skip === 0 && _this.numTotalResults < response.queryOptions.limit) {
                        _this.from = 1;
                        _this.to = _this.numTotalResults;
                    }

                    return {
                        total: _this.numTotalResults,
                        rows: response.response[0].result
                    };
                },
                onClickRow: function(row, element, field) {
                    if (_this._config.multiSelection) {
                        $(element).toggleClass("success");
                        const index = element[0].getAttribute("data-index");
                        // Check and uncheck actions trigger events that are captured below
                        if ("selected" === element[0].className) {
                            $(PolymerUtils.getElementById(_this._prefix + "SampleBrowserGrid")).bootstrapTable("uncheck", index);
                        } else {
                            $(PolymerUtils.getElementById(_this._prefix + "SampleBrowserGrid")).bootstrapTable("check", index);
                        }
                    } else {
                        $(".success").removeClass("success");
                        $(element).addClass("success");
                    }

                    _this._onSelectSample(row);
                },
                onCheck: function(row, elem) {
                    // check sample is not already selected
                    for (const i in _this._samples) {
                        if (_this._samples[i].id === row.id) {
                            return;
                        }
                    }

                    // we add samples to selected samples
                    _this._samples = row;
                    _this.samples = _this._samples.slice();

                },
                onUncheck: function(row, elem) {
                    let sampleToDeleteIdx = -1;
                    for (const i in _this.samples) {
                        if (_this.samples[i].id === row.id) {
                            sampleToDeleteIdx = i;
                            break;
                        }
                    }

                    if (sampleToDeleteIdx === -1) {
                        return;
                    }

                    _this._samples = _this._samples.splice(sampleToDeleteIdx, 1);
                    _this.samples = _this._samples.slice();
                },
                onCheckAll: function(rows) {
                    const newSamples = _this._samples.slice();
                    // check sample is not already selected
                    rows.forEach(sample => {
                        const existsNewSelected = _this._samples.some(sampleSelected => {
                            return sampleSelected.id === sample.id;
                        });

                        if (!existsNewSelected) {
                            newSamples.push(sample);
                        }
                    });

                    // we add samples to selected samples
                    _this._samples = newSamples;
                    _this.samples = newSamples.slice();

                },
                onUncheckAll: function(rows) {
                    // check sample is not already selected
                    rows.forEach(sample => {
                        _this._samples = _this._samples.filter(sampleSelected => {
                            return sampleSelected.id !== sample.id;
                        });

                    });

                    // we add samples to selected samples
                    //                            _this.push("_samples", row);
                    // _this.set('samples', _this._samples.slice());
                    _this.samples =_this._samples.slice();


                },
                onLoadSuccess: function(data) {
                    // Check all already selected rows. Selected samples are stored in this.samples array
                    if (UtilsNew.isNotUndefinedOrNull(_table)) {
                        if (!_this._config.multiSelection) {
                            PolymerUtils.querySelector(_table.selector).rows[1].setAttribute("class", "success");
                            _this._onSelectSample(data.rows[0]);
                        }

                        if (_this.samples !== "undefined") {
                            for (const idx in _this.samples) {
                                for (const j in data.rows) {
                                    if (_this.samples[idx].id === data.rows[j].id) {
                                        $(PolymerUtils.getElementById(_this._prefix + "SampleBrowserGrid")).bootstrapTable("check", j);
                                        break;
                                    }
                                }
                            }
                        }
                    }


                },
                onPageChange: function(page, size) {
                    _this.from = (page - 1) * size + 1;
                    _this.to = page * size;
                }
                //                         onPostBody: function() {
                //                             if(PolymerUtils.getElementsByClassName(_this._prefix + 'Download')) {
                //                                 PolymerUtils.querySelectorAll("." + _this._prefix + "Download").forEach(elem => elem.addEventListener("click", _this.downloadQCFile.bind(_this), true));
                //
                // //                                PolymerUtils.getElementById(_this._prefix + 'Download').addEventListener('click', _this.downloadQCFile.bind(_this));
                //                             }
                //                         }
            });
        } else {
            // Delete table
            $(PolymerUtils.getElementById(this._prefix + "SampleBrowserGrid")).bootstrapTable("destroy");
            this.numTotalResults = 0;
        }
    }

    _onSelectSample(row) {
        if (typeof row !== "undefined") {
            this.dispatchEvent(new CustomEvent("selectsample", {detail: {id: row.id, sample: row}}));
        }
    }

    onColumnChange(e) {
        const table = $("#" + this._prefix + "SampleBrowserGrid");
        if (e.detail.selected) {
            table.bootstrapTable("showColumn", e.detail.id);
        } else {
            table.bootstrapTable("hideColumn", e.detail.id);
        }
    }

    // stateFormatter(value, row, index) {
    //     if (typeof this.field.context.samples !== "undefined") {
    //         for (let idx in this.field.context.samples) {
    //             if (this.field.context.samples[idx].name === row.name) {
    //                 break;
    //             }
    //         }
    //     }
    // }

    individualFormatter(value, row) {
        if (UtilsNew.isNotUndefined(row.attributes) && UtilsNew.isNotUndefined(row.attributes.individual) &&
            UtilsNew.isNotUndefined(row.attributes.individual.id)) {
            return row.attributes.individual.id;
        } else {
            return "-";
        }
    }

    dateFormatter(value, row) {
        return moment(value, "YYYYMMDDHHmmss").format("D MMM YYYY");
    }

    cellTypeFormatter(value, row) {
        return (row.somatic) ? "Somatic" : "Germline";
    }

    _initTableColumns() {
        const columns = [];
        if (this._config.multiSelection) {
            columns.push({
                field: {source: "state", context: this},
                checkbox: true,
                // formatter: this.stateFormatter,
                eligible: false
            });
        }

        this._columns = [
            columns.concat([
                {
                    title: "Sample ID",
                    field: "id"
                },
                {
                    title: "Individual ID",
                    field: "attributes.individual.id",
                    formatter: this.individualFormatter
                },
                {
                    title: "Source",
                    field: "source"
                },
                {
                    title: "Collection Method",
                    field: "collection.method"
                },
                {
                    title: "Preparation Method",
                    field: "processing.preparationMethod"
                },
                // {
                //     title: 'Sex',
                //     field: 'attributes.individual.sex'
                // },
                // {
                //     title: 'Diagnosis',
                //     formatter: this.diagnosisFormatter
                // },
                // {
                //     title: 'HPO',
                //     formatter: this.hpoFormatter
                // },
                // {
                //     title: 'Father',
                //     field: 'attributes.individual.father.id',
                //     formatter: this.fatherFormatter
                // },
                // {
                //     title: 'Mother',
                //     field: 'attributes.individual.mother.id',
                //     formatter: this.motherFormatter
                // },
                {
                    title: "Cell Line",
                    formatter: this.cellTypeFormatter
                },
                {
                    title: "Creation Date",
                    field: "creationDate",
                    formatter: this.dateFormatter
                },
                {
                    title: "Status",
                    field: "status.name"
                }
            ])
        ];

        return this._columns;
    }

    getDefaultConfig() {
        return {
            pagination: true,
            pageSize: 10,
            pageList: [10, 25, 50],
            showExport: false,
            detailView: false,
            detailFormatter: undefined, // function with the detail formatter
            multiSelection: false
        };
    }


    render() {
        return html`
        <style include="jso-styles"></style>
            <opencb-grid-toolbar .from="${this.from}" .to="${this.to}" .numTotalResultsText="${this.numTotalResultsText}"
                             .config="${this.toolbarConfig}" @columnchange="${this.onColumnChange}"></opencb-grid-toolbar>

        <div id="${this._prefix}GridTableDiv" style="margin-top: 10px">
            <table id="${this._prefix}SampleBrowserGrid">
                <thead style="background-color: #eee"></thead>
            </table>
        </div>
        `;
    }

}

customElements.define("opencga-sample-grid", OpencgaSampleGrid);