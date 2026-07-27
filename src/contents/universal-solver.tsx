import type { PlasmoCSConfig } from "plasmo";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import usePluginConfig from "~hooks/use-plugin-config";
import useQuestionSolver from "~hooks/use-question-solver";
import useOpenAI from "~hooks/use-openai";
import type { OpenQuestionAnswer } from "~models/questions";
import { t } from "~i18n";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    all_frames: false
};

interface ExtractedInput {
    element: HTMLElement;
    labelText: string;
}

interface ScannedQuestion {
    id: string;
    questionText: string;
    type: "single" | "multiple" | "text";
    inputs: ExtractedInput[];
    status: "idle" | "loading" | "success" | "error";
    answerText?: string;
    correctIndices?: number[];
}

const UniversalSolver = () => {
    const { pluginConfig } = usePluginConfig();
    const { generateAnswer } = useQuestionSolver();
    const { requestAI } = useOpenAI();

    const [isOpen, setIsOpen] = useState(false);
    const [scannedQuestions, setScannedQuestions] = useState<ScannedQuestion[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [autoFillMode, setAutoFillMode] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyText = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => {
            setCopiedId(null);
        }, 1500);
    };
    const [bgOpacity, setBgOpacity] = useState(() => {
        try {
            const saved = localStorage.getItem("mimo_panel_opacity");
            return saved ? Number(saved) : 90;
        } catch (e) {
            return 90;
        }
    });

    // Draggable position state
    const [position, setPosition] = useState(() => {
        try {
            const saved = localStorage.getItem("mimo_fab_position");
            return saved ? JSON.parse(saved) : { bottom: 24, right: 24 };
        } catch (e) {
            return { bottom: 24, right: 24 };
        }
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStart = React.useRef({ x: 0, y: 0, bottom: 24, right: 24 });
    const hasDragged = React.useRef(false);

    const [activeTab, setActiveTab] = useState<"scan" | "manual" | "visual">("scan");
    const [manualInput, setManualInput] = useState("");
    const [manualQuestion, setManualQuestion] = useState<ScannedQuestion | null>(null);
    const [isHidingForScreenshot, setIsHidingForScreenshot] = useState(false);
    const [visualQuestion, setVisualQuestion] = useState<{
        status: "idle" | "loading" | "success" | "error";
        answerText?: string;
    }>({ status: "idle" });

    // Keep FAB on screen during resize/orientation change
    useEffect(() => {
        const clampPos = () => {
            setPosition(prev => {
                const newBottom = Math.max(12, Math.min(window.innerHeight - 60, prev.bottom));
                const newRight = Math.max(12, Math.min(window.innerWidth - 60, prev.right));
                if (newBottom !== prev.bottom || newRight !== prev.right) {
                    return { bottom: newBottom, right: newRight };
                }
                return prev;
            });
        };
        window.addEventListener("resize", clampPos);
        clampPos();
        return () => window.removeEventListener("resize", clampPos);
    }, []);

    const handleDragStart = (clientX: number, clientY: number) => {
        dragStart.current = {
            x: clientX,
            y: clientY,
            bottom: position.bottom,
            right: position.right
        };
        setIsDragging(true);
        hasDragged.current = false;
    };

    const handleDragMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasDragged.current = true;
        }

        const newBottom = Math.max(12, Math.min(window.innerHeight - 60, dragStart.current.bottom - dy));
        const newRight = Math.max(12, Math.min(window.innerWidth - 60, dragStart.current.right - dx));

        setPosition({ bottom: newBottom, right: newRight });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        try {
            localStorage.setItem("mimo_fab_position", JSON.stringify(position));
        } catch (e) {}
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => {
            handleDragMove(e.clientX, e.clientY);
        };
        const onMouseUp = () => {
            handleDragEnd();
        };
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const onTouchEnd = () => {
            handleDragEnd();
        };

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [isDragging, position]);

    useEffect(() => {
        try {
            localStorage.setItem("mimo_panel_opacity", bgOpacity.toString());
        } catch (e) {
            console.error("Failed to save opacity:", e);
        }
    }, [bgOpacity]);

    // Detect text selections to help user focus on a specific question
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : "";
            if (text.length > 0) {
                setSelectedText(text);
            }
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, []);

    useEffect(() => {
        if (selectedText) {
            setManualInput(selectedText);
        }
    }, [selectedText]);

    // If the toggle is turned off, do not render anything
    if (!pluginConfig.showFloatingButton) {
        return null;
    }

    // Helper to find parent container of list elements
    const getCommonAncestor = (elements: HTMLElement[]): HTMLElement | null => {
        if (elements.length === 0) return null;
        let ancestor = elements[0].parentElement;
        while (ancestor) {
            if (elements.every(el => ancestor!.contains(el))) {
                return ancestor;
            }
            ancestor = ancestor.parentElement;
        }
        return null;
    };

    // Helper to get text associated with a form input
    const getLabelText = (input: HTMLElement, container: HTMLElement): string => {
        let parent = input.parentElement;
        while (parent && parent !== container) {
            if (parent.tagName === "LABEL") {
                return parent.innerText.replace(input.innerText, "").trim();
            }
            parent = parent.parentElement;
        }

        const id = input.getAttribute("id");
        if (id) {
            const label = container.querySelector(`label[for="${id}"]`) as HTMLElement;
            if (label) {
                return label.innerText.trim();
            }
        }

        const nextNode = input.nextSibling;
        if (nextNode && nextNode.textContent?.trim()) {
            return nextNode.textContent.trim();
        }

        const nextEl = input.nextElementSibling as HTMLElement;
        if (nextEl && nextEl.innerText?.trim()) {
            return nextEl.innerText.trim();
        }

        if (input.parentElement) {
            return input.parentElement.innerText.trim();
        }

        return "";
    };

    // Find the text of the question associated with a group of inputs
    const findQuestionText = (container: HTMLElement, inputs: HTMLElement[]): string => {
        const heading = container.querySelector("h1, h2, h3, h4, h5, h6, legend, .question-text, .qtext") as HTMLElement;
        if (heading && !inputs.some(input => heading.contains(input))) {
            return heading.innerText.trim();
        }

        // Try getting text before the first input element
        const firstInput = inputs[0];
        let textNodesText = "";
        const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let node = walk.nextNode();
        while (node) {
            if (firstInput.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING) {
                const txt = node.textContent?.trim();
                if (txt && txt.length > 5) {
                    textNodesText += " " + txt;
                }
            }
            node = walk.nextNode();
        }

        textNodesText = textNodesText.trim();
        if (textNodesText.length > 10) return textNodesText;

        let containerText = container.innerText || "";
        inputs.forEach(input => {
            containerText = containerText.replace(input.parentElement?.innerText || "", "");
        });
        return containerText.trim();
    };

    // Automatic scanner to find questions and interactive controls on the page
    const handleScanPage = () => {
        const detected: ScannedQuestion[] = [];

        // 1. Group Radios
        const allRadios = Array.from(document.querySelectorAll("input[type='radio']")) as HTMLInputElement[];
        const radioGroups: { [key: string]: HTMLInputElement[] } = {};
        allRadios.forEach(radio => {
            const name = radio.name || "unnamed-radio";
            if (!radioGroups[name]) radioGroups[name] = [];
            radioGroups[name].push(radio);
        });

        Object.keys(radioGroups).forEach((name, idx) => {
            const inputs = radioGroups[name];
            const container = getCommonAncestor(inputs);
            if (!container) return;

            const questionText = findQuestionText(container, inputs);
            const options = inputs.map(input => ({
                element: input,
                labelText: getLabelText(input, container) || "Option"
            }));

            detected.push({
                id: `radio-${idx}`,
                questionText,
                type: "single",
                inputs: options,
                status: "idle"
            });
        });

        // 2. Group Checkboxes
        const allCheckboxes = Array.from(document.querySelectorAll("input[type='checkbox']")) as HTMLInputElement[];
        const checkboxGroups: Map<HTMLElement, HTMLInputElement[]> = new Map();
        allCheckboxes.forEach(cb => {
            let parent = cb.parentElement;
            while (parent && parent.tagName !== "FORM" && parent.tagName !== "BODY") {
                const siblings = parent.querySelectorAll("input[type='checkbox']");
                if (siblings.length > 1) {
                    if (!checkboxGroups.has(parent)) {
                        checkboxGroups.set(parent, []);
                    }
                    checkboxGroups.get(parent)!.push(cb);
                    break;
                }
                parent = parent.parentElement;
            }
        });

        let checkboxIdx = 0;
        checkboxGroups.forEach((inputs, container) => {
            const uniqueInputs = Array.from(new Set(inputs));
            const questionText = findQuestionText(container, uniqueInputs);
            const options = uniqueInputs.map(input => ({
                element: input,
                labelText: getLabelText(input, container) || "Option"
            }));

            detected.push({
                id: `checkbox-${checkboxIdx++}`,
                questionText,
                type: "multiple",
                inputs: options,
                status: "idle"
            });
        });

        // 3. Text Fields (Quiz content inputs)
        const allTextFields = Array.from(document.querySelectorAll("input[type='text'], textarea")) as HTMLInputElement[];
        let textIdx = 0;
        allTextFields.forEach(field => {
            const name = (field.name || "").toLowerCase();
            const id = (field.id || "").toLowerCase();
            const placeholder = (field.getAttribute("placeholder") || "").toLowerCase();
            const type = field.getAttribute("type") || "";

            if (
                name.includes("search") || id.includes("search") || placeholder.includes("search") ||
                name.includes("email") || id.includes("email") ||
                name.includes("name") || id.includes("name") ||
                name.includes("key") || id.includes("key") ||
                type === "hidden" ||
                field.offsetParent === null
            ) {
                return;
            }

            let parent = field.parentElement;
            let depth = 0;
            while (parent && depth < 3) {
                parent = parent.parentElement;
                depth++;
            }
            if (!parent) return;

            const questionText = findQuestionText(parent, [field]);
            const placeholderText = field.getAttribute("placeholder") || "Answer Input";

            detected.push({
                id: `text-${textIdx++}`,
                questionText,
                type: "text",
                inputs: [{ element: field, labelText: placeholderText }],
                status: "idle"
            });
        });

        // Filter and clean questions list
        const cleaned = detected.filter(q => q.questionText.trim().length > 5);
        setScannedQuestions(cleaned);
        setIsOpen(true);
    };

    const handleFabClick = (e: React.MouseEvent) => {
        if (hasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (isOpen) {
            setIsOpen(false);
        } else {
            handleScanPage();
        }
    };

    // Solves a specific question and automatically clicks/fills the correct elements on page
    const handleSolveQuestion = async (targetQuestion: ScannedQuestion) => {
        // Update specific question status
        setScannedQuestions(prev => prev.map(q => q.id === targetQuestion.id ? { ...q, status: "loading" } : q));

        try {
            // Build optimized Question model for useQuestionSolver
            const questionData: any = {
                content: targetQuestion.questionText,
                answerType: targetQuestion.type === "single" ? "singleChoice" : targetQuestion.type === "multiple" ? "multipleChoices" : "short",
                possibleAnswers: targetQuestion.inputs.map(i => i.labelText)
            };

            // Call optimized question solver
            const solution = await generateAnswer(questionData);

            // Execute auto-clicking/filling on page
            let answeredSuccessfully = false;
            let feedbackText = "";
            let correctIndices: number[] = [];

            if (targetQuestion.type === "single" || targetQuestion.type === "multiple") {
                const closedSolution = solution as any;
                correctIndices = closedSolution.correctAnswerIndices || [];

                correctIndices.forEach((index: number) => {
                    if (index >= 0 && index < targetQuestion.inputs.length) {
                        const element = targetQuestion.inputs[index].element;
                        if (autoFillMode) {
                            element.click();
                            element.dispatchEvent(new Event("change", { bubbles: true }));
                        } else {
                            // Visual highlight in page DOM
                            const parent = element.parentElement;
                            if (parent) {
                                parent.style.backgroundColor = "rgba(46, 204, 113, 0.15)";
                                parent.style.border = "2px dashed #2ecc71";
                                parent.style.borderRadius = "4px";
                                parent.style.padding = "4px";
                                parent.style.transition = "all 0.3s ease";
                                
                                if (!parent.querySelector(".mimo-badge")) {
                                    const badge = document.createElement("span");
                                    badge.className = "mimo-badge";
                                    badge.innerText = " ✅";
                                    badge.style.color = "#2ecc71";
                                    badge.style.fontWeight = "bold";
                                    parent.appendChild(badge);
                                }
                            }
                        }
                        answeredSuccessfully = true;
                    }
                });

                if (answeredSuccessfully) {
                    feedbackText = `Suggested Option Indices: ${correctIndices.map((i: number) => i + 1).join(", ")}`;
                }
            } else if (targetQuestion.type === "text" && targetQuestion.inputs.length > 0) {
                const openSolution = solution as any;
                const textAnswer = openSolution.content || "";
                if (textAnswer) {
                    const field = targetQuestion.inputs[0].element as HTMLInputElement;
                    if (autoFillMode) {
                        field.value = textAnswer.trim();
                        field.dispatchEvent(new Event("input", { bubbles: true }));
                        field.dispatchEvent(new Event("change", { bubbles: true }));
                    } else {
                        field.style.border = "2px dashed #6366f1";
                        field.style.backgroundColor = "rgba(99, 102, 241, 0.05)";
                        field.style.transition = "all 0.3s ease";
                    }
                    answeredSuccessfully = true;
                    feedbackText = textAnswer;
                }
            }

            setScannedQuestions(prev => prev.map(q => q.id === targetQuestion.id ? { 
                ...q, 
                status: answeredSuccessfully ? "success" : "error",
                answerText: feedbackText || "Answer filled!",
                correctIndices: correctIndices
            } : q));

        } catch (error: any) {
            console.error(error);
            const errMsg = error?.message || error?.toString() || "Failed to solve.";
            setScannedQuestions(prev => prev.map(q => q.id === targetQuestion.id ? { ...q, status: "error", answerText: errMsg } : q));
        }
    };

    // Solves all scanned questions sequentially
    const handleSolveAll = async () => {
        setGlobalLoading(true);
        for (const question of scannedQuestions) {
            if (question.status !== "success") {
                await handleSolveQuestion(question);
            }
        }
        setGlobalLoading(false);
    };

    const handleSolveManual = async () => {
        if (!manualInput.trim()) return;

        const manualQ: ScannedQuestion = {
            id: "manual-question",
            questionText: manualInput.trim(),
            type: "text",
            inputs: [],
            status: "loading"
        };
        setManualQuestion(manualQ);

        try {
            // Manual solver dipaksa pakai ChatGPT Web (cookie) di VPS
            const answer = await requestAI(manualQ.questionText, undefined, "web");
            setManualQuestion({
                ...manualQ,
                status: "success",
                answerText: answer || "No answer generated."
            });
        } catch (error: any) {
            console.error(error);
            const errMsg = error?.message || error?.toString() || "Failed to solve.";
            setManualQuestion({
                ...manualQ,
                status: "error",
                answerText: errMsg
            });
        }
    };

    const handleVisualScan = async () => {
        setIsHidingForScreenshot(true);
        setVisualQuestion({
            status: "loading",
            answerText: ""
        });

        // Wait for Mimo panel to hide
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: "CAPTURE_SCREENSHOT" }, async (response) => {
                setIsHidingForScreenshot(false);

                if (!response || !response.success) {
                    setVisualQuestion({
                        status: "error",
                        answerText: response?.error || "Failed to capture screenshot."
                    });
                    return;
                }

                try {
                    const prompt = [
                        "Solve the question shown in the screenshot.",
                        "OUTPUT RULE (STRICT): Return ONLY the final answer. No reasoning, no intro, no explanation.",
                        "If multiple choice: reply exactly like 'a. option text' (lowercase letter + period + option text).",
                        "If multiple correct options: 'a. text; c. text'.",
                        "If open/short answer: return only the shortest correct answer.",
                        "Match the language of the question on screen."
                    ].join("\n");

                    const answer = await requestAI(prompt, response.dataUrl, "web");

                    setVisualQuestion({
                        status: "success",
                        answerText: answer
                    });
                } catch (err: any) {
                    setVisualQuestion({
                        status: "error",
                        answerText: err?.message || err?.toString() || "Failed to solve visually."
                    });
                }
            });
        }, 150);
    };

    const getSidebarStyle = (): React.CSSProperties => {
        let bottom = position.bottom + 60;
        let right = position.right;

        const isFabInTopHalf = position.bottom > window.innerHeight / 2;
        
        const style: React.CSSProperties = {
            opacity: bgOpacity / 100,
            display: isHidingForScreenshot ? "none" : "flex"
        };

        if (isFabInTopHalf) {
            style.top = `${window.innerHeight - position.bottom + 36}px`;
            style.bottom = "auto";
            style.maxHeight = `${position.bottom - 60}px`;
        } else {
            style.bottom = `${bottom}px`;
            style.top = "auto";
            style.maxHeight = `calc(100vh - ${bottom + 50}px)`;
        }

        const sidebarMaxWidth = window.innerWidth < 1024 ? Math.min(320, window.innerWidth - 24) : 280;
        const clampedRight = Math.min(window.innerWidth - sidebarMaxWidth - 12, right);
        style.right = `${Math.max(12, clampedRight)}px`;

        return style;
    };

    return (
        <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
            <style>{`
                .mimo-fab {
                    position: fixed;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(17, 18, 23, 0.9);
                    backdrop-filter: blur(12px);
                    color: #ffffff;
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 0 12px rgba(99, 102, 241, 0.25);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    z-index: 999999;
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s, box-shadow 0.2s;
                    outline: none;
                    user-select: none;
                    touch-action: none;
                }
                .mimo-fab:hover {
                    transform: scale(1.04) translateY(-2px);
                    border-color: rgba(99, 102, 241, 0.6);
                    box-shadow: 0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.35);
                }
                .mimo-fab:active {
                    transform: scale(0.98) translateY(0);
                }

                .mimo-sidebar {
                    position: fixed;
                    width: 280px;
                    height: auto;
                    background-color: rgba(11, 12, 16, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                    z-index: 1000000;
                    display: flex;
                    flex-direction: column;
                    color: #f3f4f6;
                    animation: mimoSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    overflow: hidden;
                }

                .mimo-sidebar *::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .mimo-sidebar *::-webkit-scrollbar-track {
                    background: transparent;
                }
                .mimo-sidebar *::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.12);
                    border-radius: 2px;
                }
                .mimo-sidebar *::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.4);
                }

                @keyframes mimoSlideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes mimoSlideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes mimoPulse {
                    0% { opacity: .6; }
                    50% { opacity: 1; }
                    100% { opacity: .6; }
                }
                @keyframes mimoRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .mimo-fab-text {
                    display: none;
                }

                @media (max-width: 1024px) {
                    .mimo-sidebar {
                        width: 320px !important;
                        max-width: calc(100vw - 24px) !important;
                    }
                }
            `}</style>

            {/* FLOATING ACTION BUTTON */}
            <button
                onClick={handleFabClick}
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                    }
                }}
                title={t("scanPage")}
                className="mimo-fab"
                style={{
                    opacity: isOpen ? bgOpacity / 100 : 1,
                    bottom: `${position.bottom}px`,
                    right: `${position.right}px`,
                    display: isHidingForScreenshot ? "none" : "flex"
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#a5b4fc" }}>
                    <path d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" fill="currentColor" stroke="none" />
                    <path d="M19.071 4.929L19 7L18.929 4.929L17 4.858L18.929 4.787L19 2.716L19.071 4.787L21.142 4.858L19.071 4.929Z" fill="currentColor" stroke="none" />
                    <path d="M5.5 5.5L5.438 7L5.375 5.5L4 5.438L5.375 5.375L5.438 4L5.5 5.375L7 5.438L5.5 5.5Z" fill="currentColor" stroke="none" />
                </svg>
                <span className="mimo-fab-text">{t("scanPage")}</span>
            </button>

            {/* SIDEBAR PANEL */}
            {isOpen && (
                <div 
                    className="mimo-sidebar"
                    style={getSidebarStyle()}
                >
                    {/* Header */}
                    <div style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                                <path d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" fill="currentColor" stroke="none" />
                            </svg>
                            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#ffffff", letterSpacing: "-0.01em" }}>
                                {t("universalTitle")}
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#9ca3af",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#9ca3af"}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div style={{
                        display: "flex",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        backgroundColor: "rgba(255, 255, 255, 0.01)"
                    }}>
                        <button
                            onClick={() => setActiveTab("scan")}
                            style={{
                                flex: 1,
                                background: "none",
                                border: "none",
                                borderBottom: activeTab === "scan" ? "2px solid #6366f1" : "2px solid transparent",
                                color: activeTab === "scan" ? "#ffffff" : "#9ca3af",
                                padding: "8px 0",
                                fontSize: "11px",
                                fontWeight: "600",
                                borderRadius: 0,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            {t("scanPage")}
                        </button>
                        <button
                            onClick={() => setActiveTab("manual")}
                            style={{
                                flex: 1,
                                background: "none",
                                border: "none",
                                borderBottom: activeTab === "manual" ? "2px solid #6366f1" : "2px solid transparent",
                                color: activeTab === "manual" ? "#ffffff" : "#9ca3af",
                                padding: "8px 0",
                                fontSize: "11px",
                                fontWeight: "600",
                                borderRadius: 0,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            {t("solveSelection")}
                        </button>
                        <button
                            onClick={() => setActiveTab("visual")}
                            style={{
                                flex: 1,
                                background: "none",
                                border: "none",
                                borderBottom: activeTab === "visual" ? "2px solid #6366f1" : "2px solid transparent",
                                color: activeTab === "visual" ? "#ffffff" : "#9ca3af",
                                padding: "8px 0",
                                fontSize: "11.5px",
                                fontWeight: "600",
                                borderRadius: 0,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            {t("visualScan")}
                        </button>
                    </div>

                    {/* Mode Toggle Banner */}
                    <div style={{
                        padding: "8px 16px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <span style={{ fontSize: "11px", color: "#d1d5db", fontWeight: "500" }}>
                            {t("autoFillModeLabel")}
                        </span>
                        <div 
                            onClick={() => setAutoFillMode(!autoFillMode)}
                            style={{
                                width: "30px",
                                height: "16px",
                                borderRadius: "8px",
                                backgroundColor: autoFillMode ? "#4f46e5" : "rgba(255, 255, 255, 0.15)",
                                border: "1px solid rgba(255, 255, 255, 0.05)",
                                cursor: "pointer",
                                position: "relative",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                display: "flex",
                                alignItems: "center",
                                padding: "0 2px",
                                boxShadow: autoFillMode ? "0 0 8px rgba(79, 70, 229, 0.4)" : "none"
                            }}
                        >
                            <div style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: "#ffffff",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                transform: autoFillMode ? "translateX(14px)" : "translateX(0px)",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
                            }} />
                        </div>
                    </div>

                    {/* Opacity Control Banner */}
                    <div style={{
                        padding: "8px 16px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px"
                    }}>
                        <span style={{ fontSize: "11px", color: "#d1d5db", fontWeight: "500", whiteSpace: "nowrap" }}>
                            Opacity
                        </span>
                        <input 
                            type="range" 
                            min="10" 
                            max="95" 
                            value={bgOpacity}
                            onChange={(e) => setBgOpacity(Number(e.target.value))}
                            style={{
                                flex: 1,
                                height: "4px",
                                borderRadius: "2px",
                                background: "rgba(255, 255, 255, 0.15)",
                                outline: "none",
                                cursor: "pointer",
                                accentColor: "#6366f1",
                                margin: 0,
                                border: "none"
                            }}
                        />
                        <span style={{ fontSize: "10px", color: "#9ca3af", width: "28px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            {bgOpacity}%
                        </span>
                    </div>

                    {/* Action Bar */}
                    {activeTab === "scan" && scannedQuestions.length > 0 && (
                        <div style={{
                            padding: "8px 16px",
                            backgroundColor: "rgba(255, 255, 255, 0.01)",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500" }}>
                                {scannedQuestions.length} Questions Found
                            </span>
                            <button
                                onClick={handleSolveAll}
                                disabled={globalLoading}
                                style={{
                                    backgroundColor: globalLoading ? "rgba(255, 255, 255, 0.05)" : "#4f46e5",
                                    color: globalLoading ? "#9ca3af" : "#ffffff",
                                    border: "none",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    cursor: globalLoading ? "not-allowed" : "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: globalLoading ? "none" : "0 3px 8px rgba(79, 70, 229, 0.2)",
                                }}
                                onMouseEnter={(e) => {
                                    if (!globalLoading) {
                                        e.currentTarget.style.backgroundColor = "#4338ca";
                                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.3)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!globalLoading) {
                                        e.currentTarget.style.backgroundColor = "#4f46e5";
                                        e.currentTarget.style.boxShadow = "0 3px 8px rgba(79, 70, 229, 0.2)";
                                    }
                                }}
                            >
                                {globalLoading ? "Solving All..." : t("solveAll")}
                            </button>
                        </div>
                    )}

                    {/* Content Body */}
                    <div style={{ padding: "12px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
                        
                        {activeTab === "scan" && (
                            scannedQuestions.length === 0 ? (
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "200px",
                                    textAlign: "center",
                                    color: "#9ca3af",
                                    gap: "12px"
                                }}>
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}>
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.4", padding: "0 20px", color: "#9ca3af" }}>
                                        {t("noQuestionsScanned")}
                                    </p>
                                    <button
                                        onClick={handleScanPage}
                                        style={{
                                            backgroundColor: "rgba(99, 102, 241, 0.08)",
                                            border: "1px solid rgba(99, 102, 241, 0.25)",
                                            color: "#a5b4fc",
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            fontWeight: "600",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                            marginTop: "4px",
                                            transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)";
                                            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.08)";
                                            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
                                        }}
                                    >
                                        {t("scanPage")}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: "600" }}>
                                        {t("scannedQuestions")}
                                    </label>
                                    
                                    {scannedQuestions.map((q, idx) => (
                                        <div key={q.id} style={{
                                            backgroundColor: "rgba(255, 255, 255, 0.02)",
                                            border: "1px solid rgba(255, 255, 255, 0.05)",
                                            borderRadius: "8px",
                                            padding: "10px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px"
                                        }}>
                                            {/* Question Text */}
                                            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                                <span style={{
                                                    fontSize: "9.5px",
                                                    fontWeight: "600",
                                                    border: "1px solid rgba(99, 102, 241, 0.4)",
                                                    color: "#a5b4fc",
                                                    width: "18px",
                                                    height: "18px",
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: "12px", fontWeight: "500", color: "#ffffff", lineHeight: "1.35" }}>
                                                    {q.questionText}
                                                </span>
                                            </div>

                                            {/* Options */}
                                            {q.type !== "text" && (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "26px" }}>
                                                    {q.inputs.map((opt, oIdx) => {
                                                        const isCorrect = q.correctIndices?.includes(oIdx);
                                                        return (
                                                            <div key={oIdx} style={{ 
                                                                fontSize: "11px", 
                                                                padding: "4px 8px",
                                                                borderRadius: "6px",
                                                                backgroundColor: isCorrect ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.01)",
                                                                border: isCorrect ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(255, 255, 255, 0.03)",
                                                                color: isCorrect ? "#10b981" : "#9ca3af", 
                                                                fontWeight: isCorrect ? "600" : "400",
                                                                display: "flex", 
                                                                alignItems: "center",
                                                                gap: "6px" 
                                                            }}>
                                                                {isCorrect ? (
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.2)", marginLeft: "3px", marginRight: "3px", flexShrink: 0 }} />
                                                                )}
                                                                <span>{opt.labelText}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Action / Status */}
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                                                paddingTop: "8px",
                                                marginTop: "2px"
                                            }}>
                                                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                                                    {q.type === "single" ? "Single Choice" : q.type === "multiple" ? "Multiple Choices" : "Text Input"}
                                                </span>

                                                {q.status === "idle" && (
                                                    <button
                                                        onClick={() => handleSolveQuestion(q)}
                                                        style={{
                                                            backgroundColor: "rgba(99, 102, 241, 0.06)",
                                                            border: "1px solid rgba(99, 102, 241, 0.2)",
                                                            color: "#a5b4fc",
                                                            padding: "4px 8px",
                                                            borderRadius: "5px",
                                                            fontSize: "10px",
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)";
                                                            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.06)";
                                                            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
                                                        }}
                                                    >
                                                        {autoFillMode ? t("solveAndFill") : t("solveAndShow")}
                                                    </button>
                                                )}

                                                {q.status === "loading" && (
                                                    <span style={{
                                                        fontSize: "10px",
                                                        color: "#818cf8",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        fontWeight: "500",
                                                        animation: "mimoPulse 1s infinite"
                                                    }}>
                                                        <span style={{
                                                            width: "10px",
                                                            height: "10px",
                                                            border: "1.5px solid rgba(99, 102, 241, 0.2)",
                                                            borderTop: "1.5px solid #818cf8",
                                                            borderRadius: "50%",
                                                            animation: "mimoRotate 0.8s linear infinite",
                                                            display: "inline-block"
                                                        }} />
                                                        Solving...
                                                    </span>
                                                )}

                                                {q.status === "success" && (
                                                    <span style={{
                                                        fontSize: "10px",
                                                        color: "#10b981",
                                                        fontWeight: "600",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                        backgroundColor: "rgba(16, 185, 129, 0.08)",
                                                        padding: "3px 6px",
                                                        borderRadius: "4px",
                                                        border: "1px solid rgba(16, 185, 129, 0.15)"
                                                    }}>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                        Answered!
                                                    </span>
                                                )}

                                                {q.status === "error" && (
                                                    <span style={{
                                                        fontSize: "10px",
                                                        color: "#ef4444",
                                                        fontWeight: "600",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                                                        padding: "3px 6px",
                                                        borderRadius: "4px",
                                                        border: "1px solid rgba(239, 68, 68, 0.15)"
                                                    }}>
                                                        Error
                                                    </span>
                                                )}
                                            </div>

                                            {/* Answer Output (optional preview) */}
                                            {q.answerText && (
                                                <div style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "3px",
                                                    backgroundColor: "rgba(99, 102, 241, 0.04)",
                                                    border: "1px solid rgba(99, 102, 241, 0.12)",
                                                    borderRadius: "6px",
                                                    padding: "6px 10px"
                                                }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#818cf8", fontWeight: "600" }}>
                                                            Suggested Content:
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopyText(q.id, q.answerText || "")}
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: "#a5b4fc",
                                                                cursor: "pointer",
                                                                fontSize: "9px",
                                                                fontWeight: "600",
                                                                padding: "2px 4px",
                                                                borderRadius: "3px",
                                                                transition: "all 0.2s ease"
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)"}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                        >
                                                            {copiedId === q.id ? "Copied!" : "Copy"}
                                                        </button>
                                                    </div>
                                                    <div style={{
                                                        fontSize: "11px",
                                                        color: "#e2e8f0",
                                                        maxHeight: "80px",
                                                        overflowY: "auto",
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: "1.4"
                                                    }}>
                                                        {q.answerText}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                        {activeTab === "manual" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                                <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: "600" }}>
                                    {t("solveSelection")}
                                </label>
                                <textarea
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    placeholder={t("manualInputPlaceholder")}
                                    style={{
                                        width: "100%",
                                        minHeight: "80px",
                                        maxHeight: "150px",
                                        padding: "8px 10px",
                                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                                        border: "1px solid rgba(255, 255, 255, 0.08)",
                                        borderRadius: "8px",
                                        color: "#ffffff",
                                        fontSize: "11.5px",
                                        lineHeight: "1.4",
                                        outline: "none",
                                        resize: "vertical"
                                    }}
                                />
                                <button
                                    onClick={handleSolveManual}
                                    disabled={manualQuestion?.status === "loading"}
                                    style={{
                                        backgroundColor: manualQuestion?.status === "loading" ? "rgba(255, 255, 255, 0.05)" : "#4f46e5",
                                        color: manualQuestion?.status === "loading" ? "#9ca3af" : "#ffffff",
                                        border: "none",
                                        padding: "8px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        cursor: manualQuestion?.status === "loading" ? "not-allowed" : "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {manualQuestion?.status === "loading" ? "Solving..." : t("askMimo")}
                                </button>

                                {manualQuestion && (
                                    <div style={{
                                        marginTop: "6px",
                                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                                        border: "1px solid rgba(255, 255, 255, 0.05)",
                                        borderRadius: "8px",
                                        padding: "10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: "600" }}>
                                                Result:
                                            </span>
                                            {manualQuestion.status === "loading" && (
                                                <span style={{ fontSize: "10px", color: "#818cf8", animation: "mimoPulse 1s infinite" }}>
                                                    Solving...
                                                </span>
                                            )}
                                            {manualQuestion.status === "success" && (
                                                <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "600" }}>
                                                    Answered
                                                </span>
                                            )}
                                            {manualQuestion.status === "error" && (
                                                <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "600" }}>
                                                     Error
                                                </span>
                                            )}
                                        </div>
                                        {manualQuestion.answerText && (
                                            <div style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                                backgroundColor: "rgba(99, 102, 241, 0.04)",
                                                border: "1px solid rgba(99, 102, 241, 0.12)",
                                                borderRadius: "6px",
                                                padding: "8px 10px"
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: "600" }}>
                                                        Suggested Answer:
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyText("manual-result", manualQuestion.answerText || "")}
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            color: "#a5b4fc",
                                                            cursor: "pointer",
                                                            fontSize: "10px",
                                                            fontWeight: "600",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        {copiedId === "manual-result" ? "Copied!" : "Copy"}
                                                    </button>
                                                </div>
                                                <div style={{
                                                    fontSize: "11.5px",
                                                    color: "#e2e8f0",
                                                    lineHeight: "1.4",
                                                    whiteSpace: "pre-wrap",
                                                    maxHeight: "150px",
                                                    overflowY: "auto"
                                                }}>
                                                    {manualQuestion.answerText}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === "visual" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                                <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: "600" }}>
                                    {t("visualScan")}
                                </label>
                                
                                <p style={{ fontSize: "11px", color: "#9ca3af", margin: "0 0 4px 0", lineHeight: "1.4" }}>
                                    Use Visual Scan to solve questions that cannot be read from the page code (e.g. inside games, canvas, protect-lock, or custom elements).
                                </p>

                                <button
                                    onClick={handleVisualScan}
                                    disabled={visualQuestion.status === "loading"}
                                    style={{
                                        backgroundColor: visualQuestion.status === "loading" ? "rgba(255, 255, 255, 0.05)" : "#4f46e5",
                                        color: visualQuestion.status === "loading" ? "#9ca3af" : "#ffffff",
                                        border: "none",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        fontSize: "11.5px",
                                        fontWeight: "600",
                                        cursor: visualQuestion.status === "loading" ? "not-allowed" : "pointer",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px"
                                    }}
                                >
                                    {visualQuestion.status === "loading" ? (
                                        <>
                                            <span style={{
                                                width: "12px",
                                                height: "12px",
                                                border: "1.5px solid rgba(255, 255, 255, 0.2)",
                                                borderTop: "1.5px solid #ffffff",
                                                borderRadius: "50%",
                                                animation: "mimoRotate 0.8s linear infinite",
                                                display: "inline-block"
                                            }} />
                                            Scanning Screen...
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                                <circle cx="12" cy="13" r="4"/>
                                            </svg>
                                            Scan Screen & Solve
                                        </>
                                    )}
                                </button>

                                {visualQuestion.status !== "idle" && (
                                    <div style={{
                                        marginTop: "6px",
                                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                                        border: "1px solid rgba(255, 255, 255, 0.05)",
                                        borderRadius: "8px",
                                        padding: "10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: "600" }}>
                                                Result:
                                            </span>
                                            {visualQuestion.status === "loading" && (
                                                <span style={{ fontSize: "10px", color: "#818cf8", animation: "mimoPulse 1s infinite" }}>
                                                    Analyzing Screen...
                                                </span>
                                            )}
                                            {visualQuestion.status === "success" && (
                                                <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "600" }}>
                                                    Answered
                                                </span>
                                            )}
                                            {visualQuestion.status === "error" && (
                                                <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "600" }}>
                                                     Error
                                                </span>
                                            )}
                                        </div>
                                        {visualQuestion.answerText && (
                                            <div style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                                backgroundColor: "rgba(99, 102, 241, 0.04)",
                                                border: "1px solid rgba(99, 102, 241, 0.12)",
                                                borderRadius: "6px",
                                                padding: "8px 10px"
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: "10px", color: "#818cf8", fontWeight: "600" }}>
                                                        Suggested Answer:
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopyText("visual-result", visualQuestion.answerText || "")}
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            color: "#a5b4fc",
                                                            cursor: "pointer",
                                                            fontSize: "10px",
                                                            fontWeight: "600",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            transition: "all 0.2s ease"
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.15)"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        {copiedId === "visual-result" ? "Copied!" : "Copy"}
                                                    </button>
                                                </div>
                                                <div style={{
                                                    fontSize: "11.5px",
                                                    color: "#e2e8f0",
                                                    lineHeight: "1.4",
                                                    whiteSpace: "pre-wrap",
                                                    maxHeight: "150px",
                                                    overflowY: "auto"
                                                }}>
                                                    {visualQuestion.answerText}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

// Initialize on load
const mountNode = document.createElement("div");
mountNode.id = "mimo-universal-solver-root";
document.body.appendChild(mountNode);
const root = createRoot(mountNode);
root.render(<UniversalSolver />);

export default () => null;
