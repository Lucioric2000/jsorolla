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
import "./opencga-knockout-analysis-result.js";
import UtilsNew from "../../../utilsNew.js";

// this class will be in config folder
class OpencgaKnockoutAnalysisConfig {

    static get() {
        return {
            id: "knockout",
            title: "Knockout Analysis",
            icon: "",
            requires: "2.0.0",
            description: "Sample Variant Stats description",
            links: [
                {
                    title: "OpenCGA",
                    url: "http://docs.opencb.org/display/opencga/Sample+Stats",
                    icon: ""
                }
            ],
            form: {
                sections: [
                    {
                        title: "Input Parameters",
                        collapsed: false,
                        parameters: [
                            {
                                id: "sample",
                                title: "Select samples",
                                type: "SAMPLE_FILTER",
                                addButton: true,
                                showList: true,
                                fileUpload: true
                            },
                            {
                                id: "gene",
                                title: "Select gene",
                                type: "GENE_FILTER",
                                addButton: true,
                                showList: true,
                                fileUpload: true
                            },
                            {
                                id: "panel",
                                title: "Select panel",
                                type: "DISEASE_PANEL_FILTER",
                                addButton: true,
                                showList: true,
                                fileUpload: true
                            }
                        ]
                    },
                    {
                        title: "Variant Filters",
                        collapsed: false,
                        parameters: [
                            {
                                id: "type",
                                title: "Variant types",
                                type: "VARIANT_TYPE_FILTER",
                                layout: "horizontal"
                            },
                            {
                                id: "ct",
                                title: "Consequence type",
                                type: "CONSEQUENCE-TYPE-FILTER"
                            }
                        ]
                    },
                    {
                        title: "Configuration Parameters",
                        collapsed: false,
                        parameters: [
                            {
                                id: "biotype",
                                title: "Select biotype",
                                type: "category",
                                defaultValue: "protein_coding",
                                allowedValues: ["3prime_overlapping_ncrna", "IG_C_gene", "IG_C_pseudogene", "IG_D_gene", "IG_J_gene",
                                    "IG_J_pseudogene", "IG_V_gene", "IG_V_pseudogene", "Mt_rRNA", "Mt_tRNA", "TR_C_gene", "TR_D_gene",
                                    "TR_J_gene", "TR_J_pseudogene", "TR_V_gene", "TR_V_pseudogene", "antisense", "lincRNA", "miRNA",
                                    "misc_RNA", "non_stop_decay", "nonsense_mediated_decay", "polymorphic_pseudogene", "processed_pseudogene",
                                    "processed_transcript", "protein_coding", "pseudogene", "rRNA", "retained_intron", "sense_intronic",
                                    "sense_overlapping", "snRNA", "snoRNA", "transcribed_processed_pseudogene", "transcribed_unprocessed_pseudogene",
                                    "translated_processed_pseudogene", "unitary_pseudogene", "unprocessed_pseudogene"
                                ]
                            },
                            {
                                id: "filter",
                                title: "Select filter",
                                type: "text"
                            }
                            // {
                            //     id: "qual",
                            //     title: "Select quality",
                            //     type: "number"
                            // }
                        ]
                    }
                ],
                job: {
                    title: "Job Info",
                    id: "knockout-$DATE",
                    tags: "",
                    description: "",
                    button: "Run",
                    validate: function(params) {
                        alert("test:" + params);
                    }
                }
            }
        };
    }

}


export default class OpencgaKnockoutAnalysis {

    constructor(config) {
        this._config = {...OpencgaKnockoutAnalysisConfig.get(), ...config};
    }

    get config() {
        return this._config;
    }

    check() {

    }

    execute(opencgaSession, data, params) {
        let body = {};
        // data.sample ? body.sample = data.sample.join(",") : null;
        data.sample ? body.sample = data.sample : null;
        data.gene ? body.gene = data.gene.join(",") : null;
        data.biotype ? body.biotype = data.biotype.join(",") : null;
        data.consequenceType ? body.consequenceType = data.consequenceType.join(",") : null;
        data.filter ? body.filter = data.filter.join(",") : null;
        opencgaSession.opencgaClient.variants().runKnockout(body, params)
            .then(restResponse => {
            })
            .catch(e => UtilsNew.notifyError(e));
    }

    result(job, opencgaSession) {
        return html`<opencga-knockout-analysis-result .job=${job} .opencgaSession="${opencgaSession}"></opencga-knockout-analysis-result>`;
    }
}
