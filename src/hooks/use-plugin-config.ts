import { useEffect } from "react";
import useGlobalSyncedState from "~hooks/use-global-synced-state"
import { GptModel } from "~models/openai";

export enum PluginConfigKeys {
    OpenAIApiKey = "testportal-gpt-api-key",
    OpenAIModel = "testportal-gpt-api-model",
    TestportalAntiAntiTampering = "testportal-gpt-anti-anti-tampering",
    AutoSolveButtonVisibility = "testportal-gpt-btn-visibilitiy"
}

export enum AutoSolveButtonVisibility {
    VISIBLE = "visible",
    BARELY_VISIBLE = "barely_visible",
    NOT_VISIBLE = "not_visible"
}

export enum SolveMode {
    MANUAL = "manual",
    STEALTH = "stealth"
}

export enum ProviderType {
    MIMO = "mimo",
    ROUTER9 = "9router",
    CHATGPT_WEB = "chatgpt_web",
    DEEPSEEK_WEB = "deepseek_web",
    CUSTOM = "custom"
}

export const PluginConfigKey = "testportal-gpt-config-v2";

export interface PluginConfig {
    apiKey: string;
    apiModel: string;
    apiBaseUrl: string;
    antiAntiTampering: boolean;
    btnVisibility: AutoSolveButtonVisibility;
    showFloatingButton: boolean;
    solveMode: SolveMode;
    provider: ProviderType;
}

const DefaultConfig: PluginConfig = {
    apiKey: "«redacted:sk-…»",
    apiModel: GptModel.MIMO_V2_5_PRO,
    apiBaseUrl: "https://casaaraksa.duckdns.org/v1",
    antiAntiTampering: true,
    btnVisibility: AutoSolveButtonVisibility.VISIBLE,
    showFloatingButton: true,
    solveMode: SolveMode.MANUAL,
    provider: ProviderType.MIMO
}

export default function usePluginConfig() {
    const [config, setConfig] = useGlobalSyncedState<PluginConfig>(PluginConfigKey, DefaultConfig);

    useEffect(() => {
        if (config) {
            let updated = false;
            const newConfig = { ...config };

            // Migrate model if it's the old mimo-v2-flash or the old GptModel.MIMO_V2_5_PRO string "mimo-v2.5-pro"
            if (newConfig.apiModel === "mimo-v2-flash" || newConfig.apiModel === "mimo-v2.5-pro") {
                newConfig.apiModel = GptModel.MIMO_V2_5_PRO;
                updated = true;
            }

            // Migrate default URL if it's the old one
            if (newConfig.apiBaseUrl === "https://api.xiaomimimo.com/v1/chat/completions" || 
                newConfig.apiBaseUrl === "https://api.xiaomimimo.com/v1") {
                newConfig.apiBaseUrl = "https://casaaraksa.duckdns.org/v1";
                updated = true;
            }

            // Migrate API key if it's empty
            if (!newConfig.apiKey) {
                newConfig.apiKey = "sk-a9363991482934a3-wv32d0-e7ad3c87";
                updated = true;
            }

            if (updated) {
                setConfig(newConfig);
            }
        }
    }, [config, setConfig]);

    return {
        pluginConfig: {
            apiKey: config.apiKey,
            setApiKey: (val: string) => setConfig(prev => ({ ...prev, apiKey: val })),
            apiModel: config.apiModel,
            setApiModel: (val: string) => setConfig(prev => ({ ...prev, apiModel: val })),
            apiBaseUrl: config.apiBaseUrl ?? "https://casaaraksa.duckdns.org/v1",
            setApiBaseUrl: (val: string) => setConfig(prev => ({ ...prev, apiBaseUrl: val })),
            antiAntiTampering: config.antiAntiTampering,
            setAntiAntiTampering: (val: boolean) => setConfig(prev => ({ ...prev, antiAntiTampering: val })),
            btnVisibility: config.btnVisibility,
            setBtnVisibility: (val: AutoSolveButtonVisibility) => setConfig(prev => ({ ...prev, btnVisibility: val })),
            showFloatingButton: config.showFloatingButton ?? true,
            setShowFloatingButton: (val: boolean) => setConfig(prev => ({ ...prev, showFloatingButton: val })),
            solveMode: config.solveMode ?? SolveMode.MANUAL,
            setSolveMode: (val: SolveMode) => setConfig(prev => ({ ...prev, solveMode: val })),
            provider: config.provider ?? ProviderType.MIMO,
            setProvider: (val: ProviderType) => setConfig(prev => ({ ...prev, provider: val }))
        }
    }
}
