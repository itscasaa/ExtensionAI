import { sendToContentScript } from "@plasmohq/messaging"

export const handler = async (req, res) => {
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "PROXY_FETCH") {
        fetch(request.url, request.options)
            .then(async response => {
                const text = await response.text();
                sendResponse({ success: true, status: response.status, text: text });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.toString() });
            });
        return true;
    }

    if (request.type === "FETCH_IMAGE") {
        fetch(request.url)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    sendResponse({ data: reader.result, success: true });
                };
                reader.onerror = () => {
                    sendResponse({ success: false, error: "Failed to read blob" });
                }
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.toString() });
            });

        return true;
    }

    if (request.type === "CAPTURE_SCREENSHOT") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            const err = chrome.runtime.lastError;
            if (err) {
                sendResponse({ success: false, error: err.message });
            } else {
                sendResponse({ success: true, dataUrl: dataUrl });
            }
        });
        return true;
    }
});
