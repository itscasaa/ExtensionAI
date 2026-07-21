export type Locale = "en" | "pl";

type TranslationKeys = {
    // Popup
    title: string;
    welcome: string;
    supportPrompt: string;
    apiKeyLabel: string;
    apiKeyDescription: string;
    apiKeyPlaceholder: string;
    testApiKey: string;
    validatingKey: string;
    keyValid: string;
    keyInvalid: string;
    modelLabel: string;
    modelDescription: string;
    antiTamperingLabel: string;
    antiTamperingDescription: string;
    enable: string;
    visibilityLabel: string;
    visibilityDescription: string;
    visibilityVisible: string;
    visibilityBarelyVisible: string;
    visibilityInvisible: string;
    visibilityWarning: string;
    showFloatingButtonLabel: string;
    showFloatingButtonDescription: string;
    solveModeLabel: string;
    solveModeDescription: string;
    solveModeManual: string;
    solveModeStealth: string;

    // Context Manager
    contextLabel: string;
    contextDescription: string;
    noContextSelected: string;
    newContextPlaceholder: string;
    create: string;
    textContentLabel: string;
    textContentPlaceholder: string;
    filesLabel: string;
    uploading: string;
    deleteContext: string;
    deleting: string;
    removeFile: string;
    setApiKeyFirst: string;
    failedToUpload: string;

    // Auto-solve buttons
    autoSolve: string;
    solving: string;
    downloadingImage: string;
    apiError: string;

    // Error messages
    errorApiKeyNotSet: string;

    // Universal Solver
    universalTitle: string;
    solveSelection: string;
    manualInputPlaceholder: string;
    askMimo: string;
    noSelectionWarning: string;
    floatingTooltip: string;
    autoAnswerFill: string;
    detectedOptions: string;
    noOptionsFound: string;
    autoAnswerSuccess: string;
    scanPage: string;
    solveAll: string;
    scannedQuestions: string;
    noQuestionsScanned: string;
    question: string;
    autoFillModeLabel: string;
    solveAndFill: string;
    solveAndShow: string;
    visualScan: string;
};

const translations: Record<Locale, TranslationKeys> = {
    en: {
        // Popup
        title: "AntiTestportal GPT",
        welcome: "Welcome to AntiTestportal GPT. When you enter any Testportal test, you should see \"Auto-solve\" button at the bottom of the question. Click it to let the plugin generate an answer for you.",
        supportPrompt: "If you like the extension, please consider supporting me by buying me a virtual coffee at",
        apiKeyLabel: "Mimo API key:",
        apiKeyDescription: "AntiTestportal GPT requires your own API key in order to work. You can get one from Mimo website. You can test the key using the button below (please note that it will trigger an API request, for which you will be charged).",
        apiKeyPlaceholder: "mimo-...",
        testApiKey: "Test API key",
        validatingKey: "Please wait, API key validation in progress...",
        keyValid: "API key is valid! Response:",
        keyInvalid: "API key is invalid... Response:",
        modelLabel: "Mimo API model:",
        modelDescription: "Choose the model you want to use for generating answers. Please note that the model you choose will affect the quality of the answers and the cost of the API requests.",
        antiTamperingLabel: "Anti-anti-tampering:",
        antiTamperingDescription: "Testportal has a mechanism that detects when you leave the page. When you enable this option, the plugin will try to prevent this feature from working.",
        enable: "Enable",
        visibilityLabel: "Auto-solve button visibility:",
        visibilityDescription: "When set to \"Barely visible\", auto-solve button will be given 95% transparency so that it does not attract attention. You can also hide the button completely by setting this option to \"Invisible\".",
        visibilityVisible: "Visible",
        visibilityBarelyVisible: "Barely visible",
        visibilityInvisible: "Invisible",
        visibilityWarning: "Warning: Now auto-solve button will be completely invisible! You can still click it, but it won't be visible. If you don't know where the button normally is, it is recommended to switch this option to \"Barely visible\" or \"visible\".",
        showFloatingButtonLabel: "Universal floating button:",
        showFloatingButtonDescription: "Enable a floating AI assistant button on the bottom-right corner of all web pages to solve custom or selected text questions.",
        solveModeLabel: "Solving Mode:",
        solveModeDescription: "Choose how questions are solved. 'Manual' requires clicking the button and programmatically fills/clicks inputs. 'Stealth' runs automatically on page load and only shows the correct options visually without modifying any input elements.",
        solveModeManual: "Manual (Button & Auto-fill)",
        solveModeStealth: "Stealth (Auto-detect & Visual Highlight)",

        // Context Manager
        contextLabel: "Context management:",
        contextDescription: "Create and manage contexts with text and file attachments. Files will be uploaded to Mimo and used to answer questions.",
        noContextSelected: "-- No context selected --",
        newContextPlaceholder: "New context name...",
        create: "Create",
        textContentLabel: "Text content:",
        textContentPlaceholder: "Add text context that will be included in prompts...",
        filesLabel: "Files:",
        uploading: "Uploading...",
        deleteContext: "Delete context",
        deleting: "Deleting...",
        removeFile: "Remove file",
        setApiKeyFirst: "Please set your Mimo API key first.",
        failedToUpload: "Failed to upload file.",

        // Auto-solve buttons
        autoSolve: "Auto-solve question",
        solving: "Solving...",
        downloadingImage: "Downloading image...",
        apiError: "Some error happened during the API communication...",

        // Error messages
        errorApiKeyNotSet: "API key is not set in AntiTestportal GPT plugin configuration.",

        // Universal Solver
        universalTitle: "Mimo Universal Solver",
        solveSelection: "Solve Highlighted Text",
        manualInputPlaceholder: "Type or paste your question here...",
        askMimo: "Ask Mimo",
        noSelectionWarning: "Please select/highlight some text on the page first.",
        floatingTooltip: "Solve selection with Mimo",
        autoAnswerFill: "Auto Answer & Fill",
        detectedOptions: "Detected Options:",
        noOptionsFound: "No options or input fields detected near the question.",
        autoAnswerSuccess: "Answer filled/selected successfully!",
        scanPage: "Scan Page & Answer",
        solveAll: "Solve All Scanned",
        scannedQuestions: "Scanned Questions:",
        noQuestionsScanned: "Click 'Scan Page & Answer' to automatically detect questions and interactive options.",
        question: "Question",
        autoFillModeLabel: "Auto-fill inputs on page",
        solveAndFill: "Solve & Fill",
        solveAndShow: "Solve & Show Only",
        visualScan: "Visual Scan (Screenshot)"
    },
    pl: {
        // Popup
        title: "AntiTestportal GPT",
        welcome: "Witaj w AntiTestportal GPT. Po wejściu na dowolny test (na stronie Testportal lub Moodle), powinieneś zobaczyć przycisk \"Rozwiąż automatycznie\" na dole pytania. Kliknij go, aby wtyczka wygenerowała odpowiedź.",
        supportPrompt: "Jeśli podoba Ci się rozszerzenie, rozważ wsparcie mnie poprzez zakup wirtualnej kawy na",
        apiKeyLabel: "Klucz API Mimo:",
        apiKeyDescription: "AntiTestportal GPT wymaga własnego klucza API do działania. Możesz go uzyskać na stronie Mimo. Możesz przetestować klucz za pomocą poniższego przycisku (uwaga: spowoduje to wysłanie zapytania API, za które zostaniesz obciążony).",
        apiKeyPlaceholder: "mimo-...",
        testApiKey: "Przetestuj klucz API",
        validatingKey: "Proszę czekać, trwa walidacja klucza API...",
        keyValid: "Klucz API jest prawidłowy! Odpowiedź:",
        keyInvalid: "Klucz API jest nieprawidłowy... Odpowiedź:",
        modelLabel: "Model API Mimo:",
        modelDescription: "Wybierz model, którego chcesz używać do generowania odpowiedzi. Pamiętaj, że wybrany model wpływa na jakość odpowiedzi i koszt zapytań API.",
        antiTamperingLabel: "Anti-anti-tampering:",
        antiTamperingDescription: "Testportal posiada mechanizm wykrywający opuszczenie strony. Po włączeniu tej opcji, wtyczka spróbuje zablokować działanie tej funkcji.",
        enable: "Włącz",
        visibilityLabel: "Widoczność przycisku auto-rozwiązywania:",
        visibilityDescription: "Przy ustawieniu \"Ledwo widoczny\", przycisk auto-rozwiązywania będzie miał 95% przezroczystość, aby nie przyciągał uwagi. Możesz też całkowicie ukryć przycisk ustawiając opcję \"Niewidoczny\".",
        visibilityVisible: "Widoczny",
        visibilityBarelyVisible: "Ledwo widoczny",
        visibilityInvisible: "Niewidoczny",
        visibilityWarning: "Uwaga: Przycisk auto-rozwiązywania będzie teraz całkowicie niewidoczny! Nadal możesz go kliknąć, ale nie będzie widoczny. Jeśli nie wiesz, gdzie normalnie znajduje się przycisk, zaleca się zmianę tej opcji na \"Ledwo widoczny\" lub \"Widoczny\".",
        showFloatingButtonLabel: "Pływający asystent:",
        showFloatingButtonDescription: "Włącz pływający przycisk asystenta AI w prawym dolnym rogu na wszystkich stronach internetowych, aby rozwiązywać niestandardowe pytania lub zaznaczony tekst.",
        solveModeLabel: "Tryb rozwiązywania:",
        solveModeDescription: "Wybierz sposób rozwiązywania pytań. 'Ręczny' wymaga kliknięcia przycisku i automatycznie wypełnia pola. 'Ukryty' działa przy ładowaniu strony i tylko pokazuje odpowiedzi wizualnie, bez interakcji z polami.",
        solveModeManual: "Ręczny (Przycisk i autouzupełnianie)",
        solveModeStealth: "Ukryty (Autowykrywanie i podświetlanie)",

        // Context Manager
        contextLabel: "Zarządzanie kontekstem:",
        contextDescription: "Twórz i zarządzaj kontekstami z tekstem i załącznikami. Pliki zostaną przesłane do Mimo i użyte do odpowiadania na pytania.",
        noContextSelected: "-- Brak wybranego kontekstu --",
        newContextPlaceholder: "Nazwa nowego kontekstu...",
        create: "Utwórz",
        textContentLabel: "Treść tekstowa:",
        textContentPlaceholder: "Dodaj tekst kontekstu, który zostanie dołączony do promptów...",
        filesLabel: "Pliki:",
        uploading: "Przesyłanie...",
        deleteContext: "Usuń kontekst",
        deleting: "Usuwanie...",
        removeFile: "Usuń plik",
        setApiKeyFirst: "Najpierw ustaw klucz API Mimo.",
        failedToUpload: "Nie udało się przesłać pliku.",

        // Auto-solve buttons
        autoSolve: "Rozwiąż automatycznie",
        solving: "Rozwiązywanie...",
        downloadingImage: "Pobieranie obrazu...",
        apiError: "Wystąpił błąd podczas komunikacji z API...",

        // Error messages
        errorApiKeyNotSet: "Klucz API nie jest ustawiony w konfiguracji wtyczki AntiTestportal GPT.",

        // Universal Solver
        universalTitle: "Uniwersalny pomocnik Mimo",
        solveSelection: "Rozwiąż zaznaczony tekst",
        manualInputPlaceholder: "Wpisz lub wklej swoje pytanie tutaj...",
        askMimo: "Zapytaj Mimo",
        noSelectionWarning: "Najpierw zaznacz/podświetl tekst na stronie.",
        floatingTooltip: "Rozwiąż zaznaczenie z Mimo",
        autoAnswerFill: "Automatycznie odpowiedz i wypełnij",
        detectedOptions: "Wykryte opcje:",
        noOptionsFound: "Nie wykryto żadnych opcji ani pól wprowadzania w pobliżu pytania.",
        autoAnswerSuccess: "Odpowiedź została pomyślnie wypełniona/wybrana!",
        scanPage: "Skanuj stronę i odpowiedz",
        solveAll: "Rozwiąż wszystkie zeskanowane",
        scannedQuestions: "Zeskanowane pytania:",
        noQuestionsScanned: "Kliknij 'Skanuj stronę i odpowiedz', aby automatycznie wykryć pytania i opcje interaktywne.",
        question: "Pytanie",
        autoFillModeLabel: "Automatycznie wypełniaj pola na stronie",
        solveAndFill: "Rozwiąż i wypełnij",
        solveAndShow: "Rozwiąż i pokaż",
        visualScan: "Skanowanie wizualne (Zrzut)"
    }
};

/**
 * Detects the current browser locale
 * @returns "pl" for Polish browsers, "en" for all others
 */
export function detectLocale(): Locale {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("pl")) {
        return "pl";
    }
    return "en";
}

// Current locale (detected once at module load)
let currentLocale: Locale = detectLocale();

/**
 * Get the current locale
 */
export function getLocale(): Locale {
    return currentLocale;
}

/**
 * Override the current locale (useful for testing)
 */
export function setLocale(locale: Locale): void {
    currentLocale = locale;
}

/**
 * Get a translated string by key
 * @param key The translation key
 * @returns The translated string in the current locale
 */
export function t(key: keyof TranslationKeys): string {
    return translations[currentLocale][key];
}

/**
 * Get all translations for the current locale
 */
export function getTranslations(): TranslationKeys {
    return translations[currentLocale];
}

export default t;
