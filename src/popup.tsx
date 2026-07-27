import "style.css";

import { useState, useEffect } from "react";

import useOpenAI from "~hooks/use-openai";
import usePluginConfig, { AutoSolveButtonVisibility, SolveMode, ProviderType } from "~hooks/use-plugin-config";
import { GptModel } from "~models/openai";
import ContextManager from "~components/ContextManager";
import { t } from "~i18n";

function IndexPopup() {
    const { pluginConfig } = usePluginConfig();
    const { requestAI, fetchModels } = useOpenAI();

    const [keyValid, setKeyValid] = useState<boolean | null>(null);
    const [keyValidationInProgress, setKeyValidationInProgress] = useState<boolean>(false);
    const [keyValidationResponse, setKeyValidationResponse] = useState<string>("");

    const [fetchedModels, setFetchedModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState<boolean>(false);
    const [showCustomModelInput, setShowCustomModelInput] = useState<boolean>(false);

    useEffect(() => {
        if (pluginConfig.apiBaseUrl === "https://api.9router.com/v1/chat/completions") {
            pluginConfig.setApiBaseUrl("http://localhost:20128/v1");
            pluginConfig.setApiModel("YGFreeAja");
        }
    }, [pluginConfig.apiBaseUrl]);

    useEffect(() => {
        let active = true;
        async function loadModels() {
            if (pluginConfig.provider === "chatgpt_web" || pluginConfig.provider === "deepseek_web") {
                setFetchedModels([]);
                setShowCustomModelInput(false);
                return;
            }
            if (pluginConfig.apiBaseUrl === "https://casaaraksa.duckdns.org/v1") {
                setFetchedModels([]);
                setShowCustomModelInput(false);
                return;
            }
            if (!pluginConfig.apiKey) {
                setFetchedModels([]);
                setShowCustomModelInput(true);
                return;
            }
            setLoadingModels(true);
            try {
                const list = await fetchModels();
                if (active) {
                    setFetchedModels(list);
                    if (list.length > 0) {
                        const inList = list.includes(pluginConfig.apiModel);
                        if (!inList && pluginConfig.apiModel !== "") {
                            setShowCustomModelInput(true);
                        } else if (pluginConfig.apiModel === "") {
                            // Default to first fetched model if config model is empty
                            pluginConfig.setApiModel(list[0]);
                            setShowCustomModelInput(false);
                        } else {
                            setShowCustomModelInput(false);
                        }
                    } else {
                        setShowCustomModelInput(true);
                    }
                }
            } catch (err) {
                console.error("Failed to load models:", err);
                if (active) {
                    setFetchedModels([]);
                    setShowCustomModelInput(true);
                }
            } finally {
                if (active) setLoadingModels(false);
            }
        }
        loadModels();
        return () => {
            active = false;
        };
    }, [pluginConfig.apiBaseUrl, pluginConfig.apiKey]);

    async function onTestApiKey() {
        const prompt = "Respond with OK";
        setKeyValidationInProgress(true);
        try {
            const response = await requestAI(prompt);
            setKeyValid(true);
            setKeyValidationResponse(response);
            setKeyValidationInProgress(false);
        } catch (error) {
            setKeyValid(false);
            setKeyValidationResponse(error instanceof Error ? error.message : error.toString());
            setKeyValidationInProgress(false);
        }
    }

    return <div className={"popup-container"}>
        <h1>{t("title")} <span className="popup-version">v{chrome.runtime.getManifest().version}</span></h1>
        <p>
            {t("welcome")}
        </p>
        <p className={"popup-buy-coffee-prompt"}>
            {t("supportPrompt")} <a href={"https://buycoffee.to/danielrogowski"} target={"_blank"} rel={"noopener noreferrer"}>Buycoffee.to</a>.
        </p>

        <br />

        <div>
            <label className={"popup-field-label"}>API Provider:</label>
            <p>
                Select the AI service provider you want to use.
            </p>
            <select 
                value={pluginConfig.provider} 
                onChange={(e) => {
                    const val = e.target.value as any;
                    pluginConfig.setProvider(val);
                    if (val === "mimo") {
                        pluginConfig.setApiBaseUrl("https://casaaraksa.duckdns.org/v1");
                        pluginConfig.setApiModel("mimo/mimo-v2.5-pro");
                        pluginConfig.setApiKey("«redacted:sk-…»");
                    } else if (val === "9router") {
                        pluginConfig.setApiBaseUrl("http://localhost:20128/v1");
                        pluginConfig.setApiModel("YGFreeAja");
                    } else if (val === "chatgpt_web") {
                        pluginConfig.setApiBaseUrl("https://chatgpt.com");
                        pluginConfig.setApiModel("chatgpt_web");
                        pluginConfig.setApiKey("cookie");
                    } else if (val === "deepseek_web") {
                        pluginConfig.setApiBaseUrl("https://chat.deepseek.com");
                        pluginConfig.setApiModel("deepseek_web");
                        pluginConfig.setApiKey("cookie");
                    } else {
                        pluginConfig.setApiBaseUrl("");
                        pluginConfig.setApiModel("");
                    }
                }}
            >
                <option value="mimo">Mimo API</option>
                <option value="9router">9router API (Local)</option>
                <option value="chatgpt_web">ChatGPT (Web Cookie)</option>
                <option value="deepseek_web">DeepSeek (Web Cookie)</option>
                <option value="custom">Custom Endpoint</option>
            </select>
        </div>

        {pluginConfig.provider === "custom" && (
            <div style={{ marginTop: "12px" }}>
                <label className={"popup-field-label"}>Custom API Base URL:</label>
                <input 
                    type="text" 
                    value={pluginConfig.apiBaseUrl} 
                    onChange={e => pluginConfig.setApiBaseUrl(e.target.value)}
                    placeholder="https://api.yourprovider.com/v1/chat/completions" 
                />
            </div>
        )}

        <hr />

        {pluginConfig.provider !== "chatgpt_web" && pluginConfig.provider !== "deepseek_web" && (
            <div>
                <label className={"popup-field-label"}>
                    {pluginConfig.provider === "mimo" ? t("apiKeyLabel") : "API Key:"}
                </label>

                <p>
                    {pluginConfig.provider === "mimo" 
                        ? t("apiKeyDescription") 
                        : "AntiTestportal GPT requires an API key in order to work. You can test the key using the button below."}
                </p>

            <input type={"text"} value={pluginConfig.apiKey} onChange={e => pluginConfig.setApiKey(e.target.value)}
                placeholder={
                    pluginConfig.apiBaseUrl === "https://casaaraksa.duckdns.org/v1" ? "sk-..." : "api key..."
                } />
            <button className={"popup-test-key-btn"} onClick={onTestApiKey}>{t("testApiKey")}</button>

            {keyValidationInProgress && <p className={"popup-key-validation-in-progress"}>
                {t("validatingKey")}
            </p>}

            {keyValid === true && <p className={"popup-successful-key-validation"}>
                {t("keyValid")} {keyValidationResponse}.
            </p>}

            {keyValid === false && <p className={"popup-failed-key-validation"}>
                {t("keyInvalid")} {keyValidationResponse}.
            </p>}
        </div>
        )}

        <hr />

        {pluginConfig.provider !== "chatgpt_web" && pluginConfig.provider !== "deepseek_web" && (
        <>
        <div>
            <label className={"popup-field-label"}>{t("modelLabel")}</label>
            <p>
                {pluginConfig.provider === "mimo"
                    ? t("modelDescription")
                    : "Specify the model to use, or select an auto-detected model."}
            </p>
            {pluginConfig.provider === "mimo" ? (
                <select value={pluginConfig.apiModel} onChange={e => pluginConfig.setApiModel(e.target.value)}>
                    {Object.values(GptModel).map((model) => (
                        <option key={model} value={model}>
                            {model}
                        </option>
                    ))}
                </select>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {loadingModels && <p style={{ fontSize: "11px", color: "#a5b4fc", margin: "2px 0" }}>Loading auto-detected models...</p>}
                    
                    {!loadingModels && fetchedModels.length > 0 && (
                        <select 
                            value={showCustomModelInput ? "__custom__" : pluginConfig.apiModel} 
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "__custom__") {
                                    setShowCustomModelInput(true);
                                    pluginConfig.setApiModel("");
                                } else {
                                    setShowCustomModelInput(false);
                                    pluginConfig.setApiModel(val);
                                }
                            }}
                        >
                            {fetchedModels.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                            <option value="__custom__">-- Enter custom model name --</option>
                        </select>
                    )}
                    
                    {(showCustomModelInput || fetchedModels.length === 0) && (
                        <input 
                            type="text" 
                            value={pluginConfig.apiModel} 
                            onChange={e => pluginConfig.setApiModel(e.target.value)}
                            placeholder="e.g. gpt-4o, YGFreeAja" 
                        />
                    )}
                </div>
            )}
        </div>
        </>
        )}

        {(pluginConfig.provider === "chatgpt_web" || pluginConfig.provider === "deepseek_web") && (
            <div style={{
                marginBottom: "12px",
                padding: "10px",
                borderRadius: "8px",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                fontSize: "11px",
                lineHeight: "1.45",
                color: "#c7d2fe"
            }}>
                <strong style={{ display: "block", marginBottom: "4px", color: "#a5b4fc" }}>
                    Web Cookie Mode
                </strong>
                {pluginConfig.provider === "chatgpt_web"
                    ? "Login dulu di https://chatgpt.com (browser yang sama / Kiwi profile yang sama). Extension akan pakai session cookie kamu. Tidak perlu API key."
                    : "Login dulu di https://chat.deepseek.com (browser yang sama / Kiwi profile yang sama). Extension akan pakai session cookie kamu. Tidak perlu API key."}
                <br />
                Screenshot + text/copy flow otomatis dikirim ke provider ini, lalu jawaban murni dikembalikan ke panel extension.
                <br />
                <strong style={{ color: "#a5b4fc" }}>1 percakapan reuse:</strong> semua prompt lanjut di chat yang sama (hemat token). Kalau idle &gt;24 jam, baru buat chat baru + prompt awal “jawab hanya jawaban saja”.
            </div>
        )}

        <hr />

        <div>
            <label className={"popup-field-label"}>{t("solveModeLabel")}</label>
            <p>
                {t("solveModeDescription")}
            </p>
            <select defaultValue={pluginConfig.solveMode}
                onChange={e => pluginConfig.setSolveMode(e.target.value as SolveMode)}>
                <option value={SolveMode.MANUAL} selected={pluginConfig.solveMode === SolveMode.MANUAL}>
                    {t("solveModeManual")}
                </option>
                <option value={SolveMode.STEALTH} selected={pluginConfig.solveMode === SolveMode.STEALTH}>
                    {t("solveModeStealth")}
                </option>
            </select>
        </div>

        <hr />

        <div>
            <label className={"popup-field-label"}>{t("antiTamperingLabel")}</label>
            <p>
                {t("antiTamperingDescription")}
            </p>
            <label>
                <input type={"checkbox"}
                    checked={pluginConfig.antiAntiTampering}
                    onChange={e => pluginConfig.setAntiAntiTampering(e.target.checked)} />
                {t("enable")}
            </label>
        </div>

        <hr />

        <ContextManager />

        <hr />

        <div>
            <label className={"popup-field-label"}>{t("visibilityLabel")}</label>
            <p>
                {t("visibilityDescription")}
            </p>
            <select defaultValue={pluginConfig.btnVisibility}
                onChange={e => pluginConfig.setBtnVisibility(e.target.value as AutoSolveButtonVisibility)}>
                <option value={AutoSolveButtonVisibility.VISIBLE}
                    selected={pluginConfig.btnVisibility === AutoSolveButtonVisibility.VISIBLE}>
                    {t("visibilityVisible")}
                </option>

                <option value={AutoSolveButtonVisibility.BARELY_VISIBLE}
                    selected={pluginConfig.btnVisibility === AutoSolveButtonVisibility.BARELY_VISIBLE}>
                    {t("visibilityBarelyVisible")}
                </option>

                <option value={AutoSolveButtonVisibility.NOT_VISIBLE}
                    selected={pluginConfig.btnVisibility === AutoSolveButtonVisibility.NOT_VISIBLE}>
                    {t("visibilityInvisible")}
                </option>
            </select>
            {pluginConfig.btnVisibility === AutoSolveButtonVisibility.NOT_VISIBLE && <p className="popup-visibility-warning">
                {t("visibilityWarning")}
            </p>}
        </div>

        <hr />

        <div>
            <label className={"popup-field-label"}>{t("showFloatingButtonLabel")}</label>
            <p>
                {t("showFloatingButtonDescription")}
            </p>
            <label>
                <input type={"checkbox"}
                    checked={pluginConfig.showFloatingButton}
                    onChange={e => pluginConfig.setShowFloatingButton(e.target.checked)} />
                {t("enable")}
            </label>
        </div>
    </div>;
}

export default IndexPopup
