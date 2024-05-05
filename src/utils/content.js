const LOGOUT_URL = "/secur/logout.jsp";
browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("content.js: Message received: " + request.message);
    if (request.message === "Is User Logged In?") {
        console.log("content.js: Checking if user is logged in...");
        sendResponse({ isLoggedIn: isUserLoggedIn() });
    }
    if (request.message === "logoutUser") {
        console.log("content.js: Logging out user...");
        const logoutUrl = request.logoutUrl;
        sendResponse({ response: "OK" });
        window.location.href = logoutUrl;
    }
});

browser.runtime.sendMessage({ message: "GETNEW", url: window.location.href }, (response) => {
    if (response.loginURL && !isUserLoggedIn()) {
        setTimeout(() => {
            removeEntry();
            window.location.href = response.loginURL;
        }, response.time);
    }
});

const removeEntry = () => {
    browser.storage.local.get("sf-user-switcher", (result) => {
        if (!browser.runtime.lastError) {
            const currentURL = window.location.href;
            const currentURLTmp = currentURL.substring(0, currentURL.indexOf(".")); // Modify the data
            const res = result["sf-user-switcher"];
            if (res && res.loginURLs) {
                for (let i = 0; i < res.loginURLs.length; i++) {
                    const urlTmp = res.loginURLs[i].substring(0, res.loginURLs[i].indexOf("."));
                    if (urlTmp === currentURLTmp) {
                        res.loginURLs.splice(i, 1);
                        break;
                    }
                }
                // Write the modified data back to storage
                browser.storage.local.set(result, () => {
                    if (browser.runtime.lastError) {
                        console.error("Error setting data: " + browser.runtime.lastError.message);
                    }
                });
            }
        } else {
            console.error("Error getting data: " + browser.runtime.lastError.message);
        }
    });
};

const isUserLoggedIn = () => {
    const lightningIcon = document.querySelector('lightning-icon[icon-name="utility:user"]');
    return lightningIcon !== null;
};

// Add a click event listener to the document
document.addEventListener("click", (event) => {
    // Check if the clicked element is an anchor tag (a link)
    if (event.target.tagName === "A") {
        // Get the href attribute of the clicked link
        const clickedLink = event.target.getAttribute("href");

        if (clickedLink.includes(LOGOUT_URL)) {
            // Do something when the specific link is clicked
            removeEntry();
        }
    }
});
