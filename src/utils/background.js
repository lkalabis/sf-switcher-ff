import { JsonStructure } from "../types/JsonStructure";
import { STORAGE_KEY } from "./constants";
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "GETNEW") {
        // Extract the first part of the URLs before the first "."
        const currentURL = request.url.substring(0, request.url.indexOf("."));

        browser.storage.local.get(STORAGE_KEY, (result) => {
            const loginURLs = result[STORAGE_KEY]?.loginURLs;
            const milliseconds = result[STORAGE_KEY]?.settings.MillisecondsToWaitTillRelogin;
            let found = false;

            if (loginURLs) {
                for (let i = 0; i < loginURLs.length; i++) {
                    const urlTmp = loginURLs[i].substring(0, loginURLs[i].indexOf("."));
                    if (urlTmp === currentURL) {
                        sendResponse({
                            loginURL: loginURLs[i],
                            time: milliseconds,
                        });
                        found = true;
                        break; // Exit the loop since we found a match
                    }
                }

                if (!found) {
                    // If no match was found, send a default response
                    sendResponse({
                        loginURL: null,
                        time: null,
                    });
                }
            }
        });
        return true;
    }

    if (request.message === "getSession") {
        browser.cookies.get({ url: request.sfHost, name: "sid" }, (sessionCookie) => {
            if (!sessionCookie) {
                sendResponse(null);
                return;
            }
            let session = {
                orgId: sessionCookie.value.split("!")[0],
                key: sessionCookie.value,
                hostname: sessionCookie.domain,
            };
            sendResponse(session);
        });
        return true; // Tell browser that we want to call sendResponse asynchronously.
    }
    return false;
});

browser.runtime.onInstalled.addListener(async () => {
    const result = await browser.storage.local.get(STORAGE_KEY);
    if (Object.keys(result).length === 0) {
        const jsonStructure = new JsonStructure();
        jsonStructure.settings = {
            ShowTooltip: true,
            ShowProfileNameInLabel: true,
            ShowAddFormAtTop: true,
            UseReLoginFeature: true,
            MillisecondsToWaitTillRelogin: 1000,
        };

        browser.storage.local.set({ [STORAGE_KEY]: jsonStructure }, () => {
            if (browser.runtime.lastError) {
                console.error("Error storing data: " + browser.runtime.lastError.message);
            }
        });
    }
});
