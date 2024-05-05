export let apiVersion = "56.0";
export const sfConn = {
    getSession(sfHost) {
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ message: "getSession", sfHost }, (message) => {
                if (browser.runtime.lastError) {
                    reject(new Error(browser.runtime.lastError));
                } else if (message) {
                    this.orgId = message.orgId;
                    this.instanceHostname = message.hostname
                        .replace(/\.lightning\.force\./, ".my.salesforce.") //avoid HTTP redirect (that would cause Authorization header to be dropped)
                        .replace(/\.mcas\.ms$/, ""); //remove trailing .mcas.ms if the client uses Microsoft Defender for Cloud Apps
                    this.sessionId = message.key;
                    resolve(message);
                } else {
                    reject(new Error("No message received"));
                }
            });
        });
    },

    async rest(
        url,
        {
            logErrors = true,
            method = "GET",
            api = "normal",
            body = undefined,
            bodyType = "json",
            headers = {},
            progressHandler = null,
        } = {},
    ) {
        if (!this.instanceHostname || !this.sessionId) {
            throw new Error("Session not found");
        }

        let xhr = new XMLHttpRequest();
        url += (url.includes("?") ? "&" : "?") + "cache=" + Math.random();
        xhr.open(method, "https://" + this.instanceHostname + url, true);

        xhr.setRequestHeader("Accept", "application/json; charset=UTF-8");

        if (api == "bulk") {
            xhr.setRequestHeader("X-SFDC-Session", this.sessionId);
        } else if (api == "normal") {
            xhr.setRequestHeader("Authorization", "Bearer " + this.sessionId);
        } else {
            throw new Error("Unknown api");
        }

        if (body !== undefined) {
            if (bodyType == "json") {
                body = JSON.stringify(body);
                xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
            } else if (bodyType == "raw") {
                // Do nothing
            } else {
                throw new Error("Unknown bodyType");
            }
        }

        for (let [name, value] of Object.entries(headers)) {
            xhr.setRequestHeader(name, value);
        }

        xhr.responseType = "json";
        await new Promise((resolve, reject) => {
            if (progressHandler) {
                progressHandler.abort = () => {
                    let err = new Error("The request was aborted.");
                    err.name = "AbortError";
                    reject(err);
                    xhr.abort();
                };
            }

            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    resolve();
                }
            };
            xhr.send(body);
        });
        if (xhr.status >= 200 && xhr.status < 300) {
            return xhr.response;
        } else if (xhr.status == 0) {
            if (!logErrors) {
                console.error("Received no response from Salesforce REST API", xhr);
            }
            let err = new Error();
            err.name = "SalesforceRestError";
            err.message = "Network error, offline or timeout";
            throw err;
        } else {
            if (!logErrors) {
                console.error("Received error response from Salesforce REST API", xhr);
            }
            let err = new Error();
            err.name = "SalesforceRestError";
            err.detail = xhr.response;
            try {
                err.message = err.detail
                    .map(
                        (err) =>
                            `${err.errorCode}: ${err.message}${
                                err.fields && err.fields.length > 0 ? ` [${err.fields.join(", ")}]` : ""
                            }`,
                    )
                    .join("\n");
            } catch (ex) {
                err.message = JSON.stringify(xhr.response);
            }
            if (!err.message) {
                err.message = "HTTP error " + xhr.status + " " + xhr.statusText;
            }
            throw err;
        }
    },
};
