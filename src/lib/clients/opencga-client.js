/*
 * Copyright 2016 OpenCB
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

class OpenCGAClientConfig {

    constructor(host = "172.24.193.208:8080/opencga", version = "v1", useCookies = true, cookiePrefix = "catalog") {
        this.host = host;
        this.version = version;
        this.useCookies = useCookies;
        if (this.useCookies) {
            this.setPrefix(cookiePrefix);
        } else {
            this.userId = "";
            this.sessionId = "";
        }
        // default values
        this.rpc = "rest";
    }

    setPrefix(prefix) {
        this.cookieSessionId = prefix + "_sid";
        this.cookieUserId = prefix + "_userId";
        this.cookiePassword = prefix + "_password";
        this.cookieLoginResponse = prefix + "_loginResponse";
    }

}

class OpenCGAClient {

    constructor(config) {
        this._config = config;
        this._users;
        this._projects;
        this._studies;
        this._files;
        this._samples;
        this._individuals;
        this._cohorts;
        this._jobs;
        this._families;
        this._panels;
        this._variables;
        this._alignments;
        this._variants;
        this._clinical;
        this._ga4gh;
    }

    getConfig() {
        return this._config;
    }

    setConfig(config) {
        this._config = config;
    }

    users() {
        if (typeof this._users === "undefined") {
            console.log(this._config)
            this._users = new Users(this._config)
        }
        return this._users;
    }

    projects() {
        if (typeof this._projects === "undefined") {
            this._projects = new Projects(this._config)
        }
        return this._projects;
    }

    studies() {
        if (typeof this._studies === "undefined") {
            this._studies = new Studies(this._config)
        }
        return this._studies;
    }

    files() {
        if (typeof this._files === "undefined") {
            this._files = new Files(this._config)
        }
        return this._files;
    }

    jobs() {
        if (typeof this._jobs === "undefined") {
            this._jobs = new Jobs(this._config)
        }
        return this._jobs;
    }

    samples() {
        if (typeof this._samples === "undefined") {
            this._samples = new Samples(this._config)
        }
        return this._samples;
    }

    individuals() {
        if (typeof this._individuals === "undefined") {
            this._individuals = new Individuals(this._config)
        }
        return this._individuals;
    }

    families() {
        if (typeof this._families === "undefined") {
            this._families = new Families(this._config)
        }
        return this._familie;
    }

    cohorts() {
        if (typeof this._cohorts === "undefined") {
            this._cohorts = new Cohorts(this._config)
        }
        return this._cohorts;
    }

    panels() {
        if (typeof this._panels === "undefined") {
            this._panels = new Panels(this._config)
        }
        return this._panels;
    }

    clinical() {
        if (typeof this._clinical === "undefined") {
            this._clinical = new Clinical(this._config)
        }
        return this._clinical;
    }

    variables() {
        if (typeof this._variables === "undefined") {
            this._variables = new Variables(this._config)
        }
        return this._variables;
    }

    // Analysis
    alignments() {
        if (typeof this._alignments === "undefined") {
            this._alignments = new Alignment(this._config)
        }
        return this._alignments;
    }

    variants() {
        if (typeof this._variants === "undefined") {
            this._variants = new Variant(this._config);
        }
        return this._variants;
    }

    // GA4GH
    ga4gh() {
        if (typeof this._ga4gh === "undefined") {
            this._ga4gh = new Ga4gh(this._config);
        }
        return this._ga4gh;
    }
}

// parent class
class OpenCGAParentClass {

    constructor(config) {
        if (typeof config === 'undefined') {
            this._config = new OpenCGAClientConfig();
        } else {
            this._config = config;
        }
    }

    get(category, ids, action, params, options) {
        return this.extendedGet(category, ids, null, null, action, params, options);
    }

    post(category, ids, action, params, body, options) {
        if (typeof options === 'undefined') {
            options = {};
        }
        options['method'] = 'POST';

        if (typeof params === 'undefined') {
            params = {};
        }
        params["body"] = body;
        return this.extendedGet(category, ids, null, null, action, params, options);
    }

    extendedPost(category1, ids1, category2, ids2, action, params, body, options) {
        if (typeof options === 'undefined') {
            options = {};
        }
        options['method'] = 'POST';

        if (typeof params === 'undefined') {
            params = {};
        }
        params["body"] = body;
        return this.extendedGet(category1, ids1, category2, ids2, action, params, options);
    }

    extendedGet(category1, ids1, category2, ids2, action, params, options) {
        // we store the options from the parameter or from the default values in config
        let host = this._config.host;
        let version = this._config.version;
        let rpc = this._config.rpc;
        let method = "GET";

        if (options !== undefined && options.hasOwnProperty("method")) {
            method = options.method;
        }

        if (params === undefined || params === null || params === "") {
            params = {};
        }

        // Check that sessionId is being given
        if (!params.hasOwnProperty("sid")) {
            let sid = this._getSessionId();
            if (sid !== undefined) {
                params["sid"] = sid;
            }
        }

        // If category == users and userId is not given, we try to set it
        if (category1 === "users" && (ids1 === undefined || ids1 === null || ids1 === "")) {
            ids1 = this._getUserId();
        }

        if (rpc.toLowerCase() === "rest") {
            let url = this._createRestUrl(host, version, category1, ids1, category2, ids2, action);
            // if (method === "GET") {
            url = this._addQueryParams(url, params);
            if (method === "POST") {
                options["data"] = params["body"];
                if (action === "upload") {
                    options["post-method"] = "form";
                }
            }
            console.debug("OpenCGA client calling to " + url);
            // if the URL query fails we try with next host
            let response = RestClient.callPromise(url, options);
            return response;
        }
    }

    _createRestUrl(host, version, category1, ids1, category2, ids2, action) {
        let url;
        if (host.startsWith("https://")) {
            url = host + "/webservices/rest/" + version + "/" + category1 + "/";
        } else {
            url = "http://" + host + "/webservices/rest/" + version + "/" + category1 + "/";
        }

        // Some web services do not need IDs
        if (typeof ids1 != "undefined" && ids1 != null) {
            url += ids1 + "/";
        }

        // Some web services do not need a second category
        if (typeof category2 != "undefined" && category2 != null) {
            url += category2 + "/";
        }

        // Some web services do not need the second category of ids
        if (typeof ids2 != "undefined" && ids2 != null) {
            url += ids2 + "/";
        }

        url += action;

        return url;
    }

    _addQueryParams(url, params) {
        // We add the query params formatted in URL
        let queryParamsUrl = this._createQueryParam(params);
        if (typeof queryParamsUrl != "undefined" && queryParamsUrl != null && queryParamsUrl != "") {
            url += "?" + queryParamsUrl;
        }
        return url;
    }

    _createQueryParam(params) {
        // Do not remove the sort! we need to sort the array to ensure that the key of the cache will be correct
        var keyArray = _.keys(params);
        var keyValueArray = [];
        for (let i in keyArray) {
            // Whatever it is inside body will be sent hidden via POST
            if (keyArray[i] !== "body") {
                keyValueArray.push(keyArray[i] + "=" + encodeURIComponent(params[keyArray[i]]));
            }
        }
        return keyValueArray.join('&');
    }

    _getUserId() {
        if (this._config.hasOwnProperty("cookieUserId")) { // The app is using cookies
            return Cookies.get(this._config.cookieUserId);
        } else if (this._config.hasOwnProperty("userId")) {
            return this._config.userId;
        }
        return undefined;
    }

    _getSessionId() {
        if (this._config.hasOwnProperty("cookieSessionId")) { // The app is using cookies
            return Cookies.get(this._config.cookieSessionId);
        } else if (this._config.hasOwnProperty("sessionId")) {
            return this._config.sessionId;
        }
        return undefined;
    }

}

class Users extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("users", undefined, "create", params, body, options);
    }

    login(userId, password) {
        let params = {
            body: {
                password: password
            }
        };
        let options = {
            method: "POST"
        };
        // Encrypt password
        let encryptedPass = CryptoJS.SHA256(password).toString();

        if (this._config.useCookies) {
            let cookieSession = Cookies.get(this._config.cookieSessionId);
            let cookieUser = Cookies.get(this._config.cookieUserId);
            let cookiePass = Cookies.get(this._config.cookiePassword);
            let loginResponse = Cookies.get(this._config.cookieLoginResponse);

            if (cookieUser !== undefined && cookieUser === userId && cookiePass !== undefined && cookiePass === encryptedPass
                && cookieSession !== undefined && loginResponse !== undefined) {
                console.log("Credentials taken from cookies");
                return Promise.resolve(JSON.parse(loginResponse));
            }
        }
        return this.get("users", userId, "login", params, options).then(function(response) {
            if (response.error === "") {
                if (this._config.useCookies) {
                    // Cookies being used
                    Cookies.set(this._config.cookieSessionId, response.response[0].result[0].id);
                    Cookies.set(this._config.cookieUserId, userId);
                    Cookies.set(this._config.cookiePassword, encryptedPass);
                    Cookies.set(this._config.cookieLoginResponse, JSON.stringify(response));
                    console.log("Cookies properly set");
                }
                this._config.sessionId = response.response[0].result[0].id;
                this._config.userId = userId;

                return response;
            }
        }.bind(this))
    }

    logout() {
        return this.get("users", this._getUserId(), "logout").then(function(response) {
            if (response.error === "") {
                if (this._config.hasOwnProperty("cookieUserId")) {
                    // Cookies being used
                    Cookies.expire(this._config.cookieSessionId);
                    Cookies.expire(this._config.cookieUserId);
                    Cookies.expire(this._config.cookiePassword);
                    Cookies.expire(this._config.cookieLoginResponse);
                    console.log("Cookies properly removed");
                }
                this._config.userId = "";
                this._config.sessionId = "";
                return response;
            }
        }.bind(this));

    }

    changeEmail(newMail) {
        let params = {
            nemail: newMail
        };
        return this.get("users", this._getUserId(), "change-email", params);
    }

    update(params, body, options) {
        return this.post("users", this._getUserId(), "update", params, body, options);
    }

    resetPassword() {
        return this.get("users", this._getUserId(), "reset-password");
    }

    info(params, options) {
        return this.get("users", this._getUserId(), "info", params, options);
    }

    getProjects(userId, params, options) {
        return this.get("users", userId, "projects", params, options);
    }

    remove(userId, params, options) {
        return this.get("users", userId, "delete", params, options);
    }

    // Filters
    getFilters(params, options) {
        return this.extendedGet("users", this._getUserId(), "configs/filters", undefined, "list", params, options);
    }

    getFilter(filter, params, options) {
        return this.extendedGet("users", this._getUserId(), "configs/filters", filter, "info", params, options);
    }

    createFilter(params, options) {
        if (options === undefined) {
            options = {};
        }
        if (params === undefined) {
            params = {};
        }
        if (!params.hasOwnProperty("body")) {
            let aux = {
                body: params
            }
            params = aux;
        }
        options["method"] = "POST";
        return this.extendedGet("users", this._getUserId(), "configs/filters", undefined, "create", params, options);
    }

    updateFilter(filter, params, options) {
        if (options === undefined) {
            options = {};
        }
        if (params === undefined) {
            params = {};
        }
        if (!params.hasOwnProperty("body")) {
            let aux = {
                body: params
            }
            params = aux;
        }
        options["method"] = "POST";
        return this.extendedGet("users", this._getUserId(), "configs/filters", filter, "update", params, options);
    }

    deleteFilter(filter) {
        return this.extendedGet("users", this._getUserId(), "configs/filters", filter, "delete", undefined, undefined);
    }

    // Configs
    getConfig(name, params, options) {
        return this.extendedGet("users", this._getUserId(), "configs", name, "info", params, options);
    }

    updateConfig(name, params, options) {
        if (options === undefined) {
            options = {};
        }
        if (params === undefined) {
            params = {};
        }
        if (!params.hasOwnProperty("body")) {
            let aux = {
                body: params
            };
            params = aux;
        }
        params["name"] = name;
        options["method"] = "POST";
        return this.extendedGet("users", this._getUserId(), "configs", undefined, "create", params, options);
    }

    deleteConfig(name) {
        return this.extendedGet("users", this._getUserId(), "configs", name, "delete", undefined, undefined);
    }

}

class Projects extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("projects", undefined, "create", params, body, options);
    }

    info(ids, params, options) {
        return this.get("projects", ids, "info", params, options);
    }

    getStudies(id, params, options) {
        return this.get("projects", id, "studies", params, options);
    }

    update(ids, params, body, options) {
        return this.post("projects", ids, "update", params, body, options);
    }

    remove(ids, params, options) {
        return this.get("projects", ids, "delete", params, options);
    }

}

class Studies extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("studies", undefined, "create", params, body, options);
    }

    remove(id, params, options) {
        return this.get("studies", id, "delete", params, options);
    }

    info(id, params, options) {
        return this.get("studies", id, "info", params, options);
    }

    summary(id, params, options) {
        return this.get("studies", id, "summary", params, options);
    }

    search(params, options) {
        return this.get("studies", undefined, "search", params, options);
    }

    getFiles(id, params, options) {
        return this.get("studies", id, "files", params, options);
    }

    getJobs(id, params, options) {
        return this.get("studies", id, "jobs", params, options);
    }

    getSamples(id, params, options) {
        return this.get("studies", id, "samples", params, options);
    }

    getGroups(id) {
        return this.get("studies", id, "groups");
    }

    getGroup(id, groupId) {
        return this.extendedGet("studies", id, "groups", groupId, "info");
    }

    createGroup(id, params, body, options) {
        return this.extendedPost("studies", id, "groups", undefined, "create", params, body, options);
    }

    deleteGroup(id, groupId) {
        return this.extendedGet("studies", id, "groups", groupId, "delete");
    }

    updateGroup(id, groupId, params, body, options) {
        return this.extendedPost("studies", id, "groups", groupId, "update", params, body, options);
    }

    update(id, params, body, options) {
        return this.post("studies", id, "update", params, body, options);
    }

    getVariants(id, params, options) {
        return this.get("studies", id, "variants", params, options);
    }

    getAlignments(id, params, options) {
        return this.get("studies", id, "alignments", params, options);
    }

}

class Files extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    search(params, options) {
        return this.get("files", undefined, "search", params, options);
    }

    link(params, options) {
        return this.get("files", undefined, "link", params, options);
    }

    info(id, params, options) {
        return this.get("files", id, "info", params, options);
    }

    groupBy(params, options) {
        return this.get("files", undefined, "groupBy", params, options);
    }

    treeView(id, params, options) {
        return this.get("files", id, "tree-view", params, options);
    }

    refresh(id, params, options) {
        return this.get("files", id, "refresh", params, options);
    }

    download(id, params, options) {
        return this.get("files", id, "download", params, options);
    }

    content(id, params, options) {
        return this.get("files", id, "content", params, options);
    }

    grep(id, params, options) {
        return this.get("files", id, "grep", params, options);
    }

    getAllBioFormats(params, options) {
        return this.get("files", undefined, "bioformats", params, options);
    }

    getAllFormats(params, options) {
        return this.get("files", undefined, "formats", params, options);
    }

    create(params, body, options) {
        return this.post("files", undefined, "create", params, body, options);
    }

    list(folderId, params, options) {
        return this.get("files", folderId, "list", params, options);
    }

    index(id, params, options) {
        return this.get("files", id, "index", params, options);
    }

    getAlignments(id, params, options) {
        return this.get("files", id, "alignments", params, options);
    }

    getVariants(id, params, options) {
        return this.get("files", id, "variants", params, options);
    }

    remove(id, params, options) {
        return this.get("files", id, "delete", params, options);
    }

    update(id, params, body, options) {
        return this.post("files", id, "update", params, body, options);
    }

    relink(id, params, options) {
        return this.get("files", id, "relink", params, options);
    }

    upload(params, options) {
        return this.post("files", undefined, "upload", undefined, params, options);
    }
}

class Jobs extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("jobs", undefined, "create", params, body, options);
    }

    visit(id, params, options) {
        return this.get("jobs", id, "visit", params, options);
    }

    groupBy(params, options) {
        return this.get("jobs", undefined, "groupBy", params, options);
    }

    info(id, params, options) {
        return this.get("jobs", id, "info", params, options);
    }

    remove(id, params, options) {
        return this.get("jobs", id, "delete", params, options);
    }

}

class Individuals extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("individuals", undefined, "create", params, body, options);
    }

    search(params, options) {
        return this.get("individuals", undefined, "search", params, options);
    }

    info(id, params, options) {
        return this.get("individuals", id, "info", params, options);
    }

    update(id, params, body, options) {
        return this.post("individuals", id, "update", params, body, options);
    }

    remove(id, params, options) {
        return this.get("individuals", id, "delete", params, options);
    }

    annotationsetsCreate(id, params, body, options) {
        return this.post("individuals", id, "annotationsets/create", params, body, options);
    }

    annotationsetsUpdate(id, name, params, body, options) {
        return this.extendedPost("individuals", id, "annotationsets", name, "update", params, body, options);
    }
}

class Families extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("families", undefined, "create", params, body, options);
    }

    search(params, options) {
        return this.get("families", undefined, "search", params, options);
    }

    info(id, params, options) {
        return this.get("families", id, "info", params, options);
    }

    update(id, params, body, options) {
        return this.post("families", id, "update", params, body, options);
    }

    annotationsetsCreate(id, params, body, options) {
        return this.post("families", id, "annotationsets/create", params, body, options);
    }

    annotationsetsUpdate(id, name, params, body, options) {
        return this.extendedPost("families", id, "annotationsets", name, "update", params, body, options);
    }

}

class Samples extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("samples", undefined, "create", params, body, options);
    }

    search(params, options) {
        return this.get("samples", undefined, "search", params, options);
    }

    groupBy(params, options) {
        return this.get("samples", undefined, "groupBy", params, options);
    }

    load(params, options) {
        return this.get("samples", undefined, "load", params, options);
    }

    info(id, params, options) {
        return this.get("samples", id, "info", params, options);
    }

    update(id, params, body, options) {
        return this.post("samples", id, "update", params, body, options);
    }

    remove(id, params, options) {
        return this.get("samples", id, "delete", params, options);
    }

    annotationsetsCreate(id, params, body, options) {
        return this.post("samples", id, "annotationsets/create", params, body, options);
    }

    annotationsetsUpdate(id, name, params, body, options) {
        return this.extendedPost("samples", id, "annotationsets", name, "update", params, body, options);
    }

}

class Variables extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("variableset", undefined, "create", params, body, options);
    }

    search(params, options) {
        return this.get("variableset", undefined, "search", params, options);
    }

    info(id, params, options) {
        return this.get("variableset", id, "info", params, options);
    }

    summary(id) {
        return this.get("variableset", id, "summary", {}, {});
    }

    update(id, params, body, options) {
        return this.post("variableset", id, "update", params, body, options);
    }

    remove(id, params, options) {
        return this.get("variableset", id, "delete", params, options);
    }

}

class Cohorts extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("cohorts", undefined, "create", params, body, options);
    }

    stats(id, params, options) {
        return this.get("cohorts", id, "stats", params, options);
    }

    search(params, options) {
        return this.get("cohorts", undefined, "search", params, options);
    }

    info(id, params, options) {
        return this.get("cohorts", id, "info", params, options);
    }

    getSamples(id, params) {
        return this.get("cohorts", id, "samples", params);
    }

    update(id, params, body, options) {
        return this.post("cohorts", id, "update", params, body, options);
    }

    remove(id, params, options) {
        return this.get("cohorts", id, "delete", params, options);
    }

    annotationsetsCreate(id, params, body, options) {
        return this.post("cohorts", id, "annotationsets/create", params, body, options);
    }

    annotationsetsUpdate(id, name, params, body, options) {
        return this.extendedPost("cohorts", id, "annotationsets", name, "update", params, body, options);
    }
}

class Panels extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("panels", undefined, "create", params, body, options);
    }

    info(id, params, options) {
        return this.get("panels", id, "info", params, options);
    }

}

class Clinical extends OpenCGAParentClass {

    constructor(config) {
        super(config);
    }

    create(params, body, options) {
        return this.post("clinical", undefined, "create", params, body, options);
    }

    info(id, params, options) {
        return this.get("clinical", id, "info", params, options);
    }

    search(params, options) {
        return this.get("clinical", undefined, "search", params, options);
    }

}

class Alignment extends OpenCGAParentClass {
    constructor(config) {
        super(config);
    }

    query(id, params, options) {
        if (params === undefined) {
            params = {};
        }
        params["file"] = id;
        return this.get("analysis/alignment", undefined, "query", params, options);
    }

    stats(id, params, options) {
        if (params === undefined) {
            params = {};
        }
        params["file"] = id;
        return this.get("analysis/alignment", undefined, "stats", params, options);
    }

    coverage(id, params, options) {
        if (params === undefined) {
            params = {};
        }
        params["file"] = id;
        return this.get("analysis/alignment", undefined, "coverage", params, options);
    }
}

class Variant extends OpenCGAParentClass {
    constructor(config) {
        super(config);
    }

    query(params, options) {
        return this.get("analysis/variant", undefined, "query", params, options);
    }

    facet(params, options) {
        return this.get("analysis/variant", undefined, "facet", params, options);
    }

    index(params, options) {
        return this.get("analysis/variant", undefined, "index", params, options);
    }
}

class Ga4gh extends OpenCGAParentClass {
    constructor(config) {
        super(config);
    }

    beacon(params, options) {
        return this.get("ga4gh", undefined, "responses", params, options);
    }
}