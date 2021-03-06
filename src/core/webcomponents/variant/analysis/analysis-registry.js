import OpencgaKnockoutAnalysis from "./opencga-knockout-analysis.js";

export default class AnalysisRegistry {

    static registry = {
        "knockout": {
            class: OpencgaKnockoutAnalysis,
            config: {} // default config (override the user config)
            // result: html`Custom result component`
        }
    }

    static get(id) {
        let ar = this.registry[id];
        // override the class default result config
        if (ar.result) {
            ar.class.result = ar.result;
        }
        if (ar.config) {
            ar.class.config = {...ar.class.config, ...ar.config};
        }
        //return Reflect.constructor(ar.class, ar.config)
        return new ar.class(ar.config);
    }
};
