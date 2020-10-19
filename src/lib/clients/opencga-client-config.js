/*
 * Copyright 2015 OpenCB
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