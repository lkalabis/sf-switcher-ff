import { JsonStructure } from "../types/JsonStructure";
import { STORAGE_KEY } from "./constants";

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === browser.runtime.OnInstalledReason.INSTALL) {
    console.log("on installed called b");
    // Check if 'sfPlugin' data is already stored
    browser.storage.local.get(STORAGE_KEY, (result) => {
      if (!result[STORAGE_KEY]) {
        // 'sfPlugin' data not found, create a basic structure
        const initialData = new JsonStructure();

        // Store the initial data in 'sfPlugin'
        browser.storage.local.set({ STORAGE_KEY: initialData.orgIds }, () => {
          console.log("Initial data stored:", initialData.orgIds);
        });
      } else {
        // 'sfPlugin' data is already present
        console.log("Existing data found:", result[STORAGE_KEY]);
      }
    });
  }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "getSession") {
    console.log("event get Session");
    browser.cookies.get(
      {
        url: request.sfHost,
        name: "sid" /*storeId: sender.tab.cookieStoreId*/,
      },
      (sessionCookie) => {
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
      },
    );
    return true; // Tell Chrome that we want to call sendResponse asynchronously.
  }
});
