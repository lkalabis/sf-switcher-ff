import { JsonStructure } from "../types/JsonStructure";
import { OrgInfo } from "../types/OrgInfo";
import { User } from "../types/User";
import { PRODUCTION_URL, SANDBOX, SANDBOX_URL, STORAGE_KEY } from "./constants";

// @ts-ignore
const handleStorageResult = (error: browser.runtime.LastError | undefined, message: string, data: User | User[]) => {
    if (error) {
        console.error("Error:", error);
    }
};

export const toastConfig = {
    position: "top-right",
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
};

export const getCurrentTabUrl = () => {
    return new Promise<string>((resolve, reject) => {
        // Get the current tab URL
        browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs: browser.tabs.Tab[]) => {
                const currentTabUrl = tabs[0]?.url;
                if (currentTabUrl) {
                    resolve(currentTabUrl);
                } else {
                    reject(new Error("Unable to get current tab URL."));
                }
            })
            .catch((error) => {
                reject(error); // Forward any errors from browser.tabs.query
            });
    });
};

export const getModifiedUrl = (url: string) => {
    const index = url.indexOf(".");
    let modifiedUrl = "";
    if (url.includes("trailblaze")) {
        modifiedUrl = url.slice(0, index) + ".trailblaze" + PRODUCTION_URL;
    } else {
        modifiedUrl = url.slice(0, index) + (url.includes(SANDBOX) ? SANDBOX_URL : PRODUCTION_URL);
    }
    return modifiedUrl;
};

/** Create a new UUID */
export const createUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const writeNewEntryToStorage = (newEntry: User, currentOrg: OrgInfo) => {
    return new Promise<void>((resolve, reject) => {
        const orgId = currentOrg.orgId;

        let existingData: JsonStructure; // Define existingData variable outside the promise chain

        browser.storage.local
            .get(STORAGE_KEY)
            .then((result) => {
                if (browser.runtime.lastError) {
                    console.error("Error:", browser.runtime.lastError);
                    reject(browser.runtime.lastError);
                    return;
                }

                const storageData = result[STORAGE_KEY] || {};
                existingData = new JsonStructure();
                existingData.orgIds = storageData;

                const userData: User = {
                    id: newEntry.Id,
                    Id: newEntry.Id,
                    Username: newEntry.Username,
                    Email: newEntry.Email,
                    OrgId: orgId,
                    Label: newEntry.Label,
                    FirstName: newEntry.FirstName,
                    LastName: newEntry.LastName,
                    Shortcut: null,
                    IsActive: true,
                    UUID: newEntry.UUID,
                    Profile: {
                        Name: newEntry.Profile.Name,
                    },
                };

                if (!storageData[orgId]) {
                    // 'orgId' not found, create a basic structure
                    const initialData = new JsonStructure();

                    // Add initial organization data
                    initialData.addOrgId(orgId, currentOrg.key, currentOrg.hostname, new Date().toISOString());
                    initialData.addUser(orgId, userData);

                    return browser.storage.local.set({
                        [STORAGE_KEY]: {
                            ...storageData,
                            [orgId]: initialData.orgIds[orgId],
                        },
                    });
                } else {
                    existingData.addUser(orgId, userData);
                    return browser.storage.local.set({ [STORAGE_KEY]: existingData.orgIds });
                }
            })
            .then(() => {
                // @ts-ignore
                handleStorageResult(browser.runtime.lastError, "Data stored successfully:", existingData.orgIds);
                resolve();
            })
            .catch((error) => {
                reject(error); // Forward any errors from browser.storage.local.get or browser.storage.local.set
            });
    });
};

export const writeAllEntriesToStorage = (entries: User[], currentOrg: OrgInfo) => {
    return new Promise<void>((resolve, reject) => {
        const orgId = currentOrg.orgId;

        let existingData: JsonStructure; // Declare existingData outside the promise chain

        browser.storage.local
            .get(STORAGE_KEY)
            .then((result) => {
                if (browser.runtime.lastError) {
                    console.error("Error:", browser.runtime.lastError);
                    reject(browser.runtime.lastError);
                    return;
                }

                const storageData = result[STORAGE_KEY] || {};
                existingData = new JsonStructure();
                existingData.orgIds = storageData;
                existingData.orgIds[orgId].users = [];

                entries.forEach((entry) => {
                    console.log(entry);
                    existingData.addUser(orgId, entry);
                });

                return browser.storage.local.set({ [STORAGE_KEY]: existingData.orgIds });
            })
            .then(() => {
                handleStorageResult(browser.runtime.lastError, "Users added:", entries);
                resolve();
            })
            .catch((error) => {
                reject(error); // Forward any errors from browser.storage.local.get or browser.storage.local.set
            });
    });
};
