import { sendToContentScript } from "@plasmohq/messaging"

export const handler = async (req, res) => {}

// ======================================================
//  CONVERSATION STATE MANAGER
//  Menyimpan 1 percakapan per provider per hari (reset tengah malam)
//  supaya hemat token & konsisten dalam 1 thread per hari
// ======================================================

interface ConvState {
    id?: string;            // ChatGPT: conversation_id | DeepSeek: session_id
    parentMsgId?: string;   // ID pesan assistant terakhir
    lastUsedAt: number;     // epoch ms
    initialized: boolean;   // sudah kirim init prompt?
}

const INIT_PROMPT = [
    "Mulai sekarang, ikuti aturan ini secara KETAT untuk SEMUA pertanyaan di sesi ini:",
    "1) TULIS JAWABAN AKHIR SAJA. Dilarang keras memberikan penjelasan, langkah-langkah, reasoning, basa-basi, atau kalimat pembuka/penutup.",
    "2) Jika soal pilihan ganda, tulis jawaban dalam format: a. teks opsi (hanya 1 baris).",
    "3) Jika jawaban singkat, tulis frasa paling pendek yang benar.",
    "4) Jangan menyalin ulang soal.",
    "Jawab 'OK' jika kamu mengerti."
].join("\n");

function getConvStorageKey(provider: string): string {
    return `extai_conv_${provider}`;
}

async function getConvState(provider: string): Promise<ConvState | null> {
    const key = getConvStorageKey(provider);
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            resolve(result[key] || null);
        });
    });
}

async function setConvState(provider: string, state: ConvState): Promise<void> {
    const key = getConvStorageKey(provider);
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: state }, resolve);
    });
}

function isSameDay(timestamp: number): boolean {
    const d1 = new Date(timestamp);
    const d2 = new Date();
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function isConvExpired(state: ConvState | null): boolean {
    if (!state || !state.lastUsedAt) return true;
    return !isSameDay(state.lastUsedAt);
}

// ======================================================
//  VPS PUPPETEER — ChatGPT Solver via VPS HTTP API
//  Extension nembak VPS → VPS jalanin Puppeteer → jawab
// ======================================================

const VPS_CHATGPT_SOLVER_URL = "https://casaaraksa.duckdns.org/api/chatgpt-solve";

async function askChatGPTWeb(prompt: string, imageBase64?: string): Promise<string> {
    // Cek state percakapan (simpan init prompt di state supaya reuse)
    let state = await getConvState("chatgpt_web");
    const expired = isConvExpired(state);

    // Kalau expired atau belum pernah init → kirim prompt awal dulu
    if (expired || !state?.initialized) {
        try {
            const initRes = await fetch(VPS_CHATGPT_SOLVER_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: INIT_PROMPT })
            });
            const initData = await initRes.json();
            if (!initData.success) {
                throw new Error(initData.error || "VPS init prompt failed");
            }
            state = {
                lastUsedAt: Date.now(),
                initialized: true
            };
            await setConvState("chatgpt_web", state);
        } catch (err: any) {
            throw new Error(`VPS ChatGPT init failed: ${err.message}`);
        }
    }

    // Kirim prompt user ke VPS Puppeteer
    const body: any = { prompt };
    if (imageBase64) {
        body.imageBase64 = imageBase64;
    }

    const res = await fetch(VPS_CHATGPT_SOLVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(`VPS ChatGPT solver error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error || "VPS ChatGPT solver failed");
    }

    // Update state setelah dapat jawaban
    state = {
        lastUsedAt: Date.now(),
        initialized: true
    };
    await setConvState("chatgpt_web", state);

    return data.answer || "No answer generated.";
}

// ======================================================
//  DEEPSEEK WEB — pakai session cookie + chat API
// ======================================================

interface DeepSeekSendResult {
    text: string;
    messageId?: string;
}

async function deepSeekSend(
    headers: Record<string, string>,
    sessionId: string,
    parentMessageId: string | null,
    prompt: string
): Promise<DeepSeekSendResult> {
    const reqBody: any = {
        chat_session_id: sessionId,
        parent_message_id: parentMessageId,
        prompt: prompt,
        ref_file_ids: [],
        search_enabled: false
    };

    const compRes = await fetch("https://chat.deepseek.com/api/v0/chat/completion", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(reqBody)
    });

    if (!compRes.ok) {
        throw new Error(`DeepSeek Web Error: ${compRes.status} ${compRes.statusText}`);
    }

    const rawText = await compRes.text();
    const lines = rawText.split("\n");
    let finalOutput = "";
    let extractedMsgId: string | undefined;

    for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                    finalOutput += data.choices[0].delta.content;
                }
                if (data.message_id) {
                    extractedMsgId = data.message_id;
                }
                if (data.message?.id) {
                    extractedMsgId = data.message.id;
                }
            } catch (e) { /* skip malformed lines */ }
        }
    }

    if (!extractedMsgId) {
        try {
            extractedMsgId = await deepSeekGetLastMessageId(headers, sessionId);
        } catch (e) { /* silent */ }
    }

    return {
        text: finalOutput.trim(),
        messageId: extractedMsgId
    };
}

async function deepSeekGetLastMessageId(
    headers: Record<string, string>,
    sessionId: string
): Promise<string | undefined> {
    const res = await fetch(
        `https://chat.deepseek.com/api/v0/chat/history?session_id=${sessionId}`,
        { headers, credentials: "include" }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const messages: any[] = data.data?.messages || data.messages || [];
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant" && messages[i].id) {
            return messages[i].id;
        }
    }
    return undefined;
}

async function deepSeekCreateSession(headers: Record<string, string>): Promise<string> {
    const chatRes = await fetch("https://chat.deepseek.com/api/v0/chat/create_session", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ character_id: null })
    });
    if (!chatRes.ok) {
        throw new Error("DeepSeek session not found. Please log in at https://chat.deepseek.com first.");
    }
    const chatJson = await chatRes.json();
    return chatJson.data.id;
}

async function askDeepSeekWeb(prompt: string, imageBase64?: string): Promise<string> {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        let state = await getConvState("deepseek_web");
        const expired = isConvExpired(state);

        if (expired || !state?.id) {
            const sessionId = await deepSeekCreateSession(headers);
            state = {
                id: sessionId,
                parentMsgId: undefined,
                lastUsedAt: Date.now(),
                initialized: false
            };
        }

        if (!state!.initialized) {
            const initResult = await deepSeekSend(headers, state!.id, null, INIT_PROMPT);
            state = {
                id: state!.id,
                parentMsgId: initResult.messageId,
                lastUsedAt: Date.now(),
                initialized: true
            };
            await setConvState("deepseek_web", state);
        }

        const result = await deepSeekSend(
            headers,
            state!.id,
            state!.parentMsgId || null,
            prompt
        );

        state = {
            id: state!.id,
            parentMsgId: result.messageId || state!.parentMsgId,
            lastUsedAt: Date.now(),
            initialized: true
        };
        await setConvState("deepseek_web", state);

        return result.text || "No answer generated.";

    } catch (e: any) {
        const msg = e.message || "";
        if (msg.includes("404") || msg.includes("403") || msg.includes("session") || msg.includes("not found")) {
            await setConvState("deepseek_web", { lastUsedAt: 0, initialized: false });
        }
        throw new Error(msg || "Failed to contact DeepSeek web.");
    }
}

// ======================================================
//  MESSAGE LISTENER — handler dari content script
// ======================================================

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

    if (request.type === "WEB_PROVIDER_ASK") {
        const { provider, prompt, imageBase64 } = request;
        
        let promise;
        if (provider === "chatgpt_web") {
            promise = askChatGPTWeb(prompt, imageBase64);
        } else if (provider === "deepseek_web") {
            promise = askDeepSeekWeb(prompt, imageBase64);
        } else {
            promise = Promise.reject(new Error("Unknown web provider: " + provider));
        }

        promise
            .then(answer => sendResponse({ success: true, answer }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        
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
                };
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
