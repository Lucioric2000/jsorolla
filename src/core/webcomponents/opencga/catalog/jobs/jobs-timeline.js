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
import Utils from "../../../../utils.js";


export default class JobsTimeline extends LitElement {

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
            active: {
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
        this._prefix = "sf-" + Utils.randomString(6) + "_";
    }

    connectedCallback() {
        super.connectedCallback();
        this._config = {...this.getDefaultConfig(), ...this.config};
    }

    updated(changedProperties) {
        if ((changedProperties.has("active") || changedProperties.has("query") || changedProperties.has("opencgaSession")) && this.active) {
            this.generateTimeline();
        }
    }

    generateTimeline() {
        console.log("query observer");
        this.querySelector("#svg").innerHTML = "";
        this.querySelector("#loading").style.display = "block";
        this.intervals = [];
        this.status = {};
        //const width = this._config.board.width === "auto" ? this.querySelector("#svg").clientWidth : this._config.board.width;
        this._config.board.width = this.querySelector("#svg").clientWidth - 200;

        const filters = {
            study: this.opencgaSession.study.fqn,
            deleted: false,
            count: true,
            // order: params.data.order,
            limit: 500,
            // skip: params.data.offset || 0,
            // include: "name",
            //exclude: "execution",
            ...this.query
        };
        this.opencgaSession.opencgaClient.jobs().search(filters).then( restResponse => {
            const results = restResponse.getResults();
            console.log(results);
            if (!results.length) {
                this.querySelector("#svg").innerHTML = "No matching records found";
                return;
            }

            this._results = results.map(result => {
                return {
                    id: result.id,
                    timestampStart: result.execution && result.execution.start ? result.execution.start : moment(result.creationDate, "YYYYMMDDHHmmss").valueOf(),
                    timestampEnd: result.execution ? result.execution.end ? result.execution.end : result.execution.start : moment(result.creationDate, "YYYYMMDDHHmmss").valueOf(),
                    status: result.internal.status.name,
                    dependsOn: result.dependsOn
                };
            }).sort((a, b) => a.timestampStart - b.timestampStart);

            this.timestampMin = Math.min(...this._results.map(_ => _.timestampStart));
            this.timestampMax = Math.max(...this._results.map(_ => _.timestampEnd));
            // console.log("timestampMinMax", timestampMin, timestampMax);

            this.tick = Math.round(this._config.board.width / this._config.ticks);
            this.dateTick = Math.round((this.timestampMax - this.timestampMin) / this._config.ticks);

            this.svg = SVG().addTo("#svg").size(1, 1);
            this.rect = this.svg.rect(1, 1).attr({fill: "#f5f5f5", x: this._config.board.originX, y: this._config.board.originY});

            this.draw = this.svg.group();

            // this.drawTicks(this._config.ticks, 500)

            let track = 0;
            // the first loop plots the intervals
            const trackLastEnd = [0]; // one element because I need a value to compare the first job ((trackLastEnd[t] + config.hspace) < jobA.start)
            for (let i = 0; i < this._results.length; i++) {
                const job = this._results[i];
                job.start = this._config.board.originX + this.rescale_linear(job.timestampStart);
                job.end = this._config.board.originX + this.rescale_linear(job.timestampEnd);

                let assigned = false;

                for (let t = 0; t < track; t++) {
                    if ((trackLastEnd[t] + this._config.hspace) < job.start) {
                        job.track = t;
                        trackLastEnd[t] = job.end;
                        assigned = true;
                        break;
                    }
                }
                // if job overlaps all the previous jobs
                if (!assigned) {
                    track++;
                    job.track = track;
                    trackLastEnd[track] = job.end;
                }
                job.y = this._config.board.originY + 50 + job.track * this._config.vspace;
                this.addInterval(job);
            }

            this._config.height = 200 + trackLastEnd.length * this._config.vspace;
            this.svg.size(this._config.board.width + 200, this._config.height);
            this.rect.size(this._config.board.width + 200, this._config.height);
            this.drawTicks(this._config.ticks, this._config.height - 100);

            //the second loop plots the dependencies arrow (if the jobs are sorted by date we can avoid it and use one loop)
            this.intervals.forEach((target, i) => {
                if (target.dependsOn && target.dependsOn.length) {
                    target.dependsOn.forEach(dep => {
                        const source = this.intervals.find(c => c.id === dep.id);
                        this.draw.line(source.start, source.y, target.start, target.y).stroke({
                            color: "#000",
                            width: 1,
                            opacity: 0.1
                        });
                    });
                }
            });

            this.draw.move(this._config.board.padding, this._config.board.padding);
        }).catch( e => {
            console.log(e);
        }).finally( () => {
            this.querySelector("#loading").style.display = "none";
        });
    }

    addInterval(job) {
        const x1 = job.start;
        const x2 = job.end;
        const y = job.y;
        const line = this.draw.line(x1, y, x2, y)
            .stroke({color: this.statusColor(job.status), width: this._config.lineWidth, linecap: "round"})
            .attr({id: job.id, class: "job", start: job.timestampStart, _color: this.statusColor(job.status)});

        line.on("click", () => this.onJobClick(line));
        this.intervals.push(job);
    }

    onJobClick(line) {
        SVG.find(".job").forEach( line => line.stroke({color: line.node.attributes._color.value}));
        line.stroke({color: "#000"});
    }

    drawTicks(num, height) {
        for (let i = 0; i <= num; i++) {
            this.draw.line(this._config.board.originX + this.tick * i, this._config.board.originY + 35, this._config.board.originX + this.tick * i, height).stroke({
                color: "#ddd",
                width: 1
            });
            this.draw.text(moment(this.timestampMin + this.dateTick * i).format("D MMM YY")).dy(this._config.board.originY).dx(this._config.board.originX + this.tick * i - 10);
        }
    }

    // min-max normalization. unix timestamp (in ms) in pixel
    rescale_linear(timestamp) {
        const oldRange = this.timestampMax - this.timestampMin;
        const minX = 0;
        const maxX = this._config.board.width;
        const newRange = maxX - minX;
        const rescaled = minX + ((timestamp - this.timestampMin) * newRange / oldRange);
        return Math.round(rescaled);
    }

    statusColor(status) {
        return {
            "PENDING": "#245da9",
            "QUEUED": "#245da9",
            "RUNNING": "#245da9",
            "DONE": "#008901",
            "ERROR": "#f00",
            "UNKNOWN": "#5b5b5b",
            "REGISTERING": "#245da9",
            "UNREGISTERED": "#5b5b5b",
            "ABORTED": "#b6904e",
            "DELETED": "#c09c00"
        }[status];
    }

    getDefaultConfig() {
        return {
            lineWidth: 10,
            ticks: 20, // number of vertical lines
            vspace: 40, // space between tracks
            hspace: 10, // space between adjacent intervals
            board: {
                width: "auto", // it can a number (px) or "auto" (full width)
                height: 0, // height is dynamic on the number of tracks
                originX: 10,
                originY: 10,
                padding: 50
            }
        };
    }

    render() {
        return html`timeline ${this.active}
        <style>
            tspan {
                font-family: sans-serif;
                font-size: 12px;
            }
        </style>
        <div id="loading" style="display: none">
            <loading-spinner></loading-spinner>
        </div>
        <div id="svg">
        </div>
        `;
    }

}

customElements.define("jobs-timeline", JobsTimeline);