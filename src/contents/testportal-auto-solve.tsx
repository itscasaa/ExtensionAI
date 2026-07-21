import type { PlasmoCSConfig } from "plasmo";
import React, { useState, useEffect, type CSSProperties, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { toast, ToastContainer } from "react-toastify";

import usePluginConfig, { AutoSolveButtonVisibility, SolveMode } from "~hooks/use-plugin-config";
import useQuestionSolver from "~hooks/use-question-solver";
import type { Answer, ClosedQuestion, ClosedQuestionAnswer, OpenQuestionAnswer, Question, QuestionType } from "~models/questions";
import { t } from "~i18n";

export const config: PlasmoCSConfig = {
    matches: [
        "https://testportal.pl/*",
        "https://testportal.net/*",
        "https://*.testportal.pl/*",
        "https://*.testportal.net/*",
        "https://testportal.com/*",
        "https://*.testportal.com/*",
        "https://teams.microsoft.com/*"
    ],
    all_frames: true
};

// Reload the page when the plugin configuration changes.
// chrome.runtime.onMessage.addListener((message) => {
//     if (message.name === MSG_GLOBAL_STATE_CHANGE) {
//         console.log("TestportalGPT content script received a message:", message);
//         window.location.reload();
//     }
// });

const TestportalAutoSolve = () => {
    const [isLoading, setLoading] = useState(false);
    const [hasRunAuto, setHasRunAuto] = useState(false);
    const { generateAnswer } = useQuestionSolver();
    const { pluginConfig } = usePluginConfig();

    function getCurrentQuestionType(): QuestionType {
        if (document.querySelector(".question_answers .rich-text-answer-container") !== null) {
            return "openLong";
        } else if (document.querySelector(".question_answers .all_short_answers") !== null) {
            return "openShort";
        } else if (document.querySelector(".question_answers .mdc-checkbox") !== null) {
            return "closedMultipleChoice";
        } else if (document.querySelector(".question_answers .mdc-radio") !== null) {
            return "closedSingleChoice";
        } else {
            throw { msg: "Unknown question type" };
        }
    }

    function getImageAttachmentUrl(): string | null {
        const imageTag = document.querySelector(".question_essence img");
        if (imageTag !== null) {
            return (imageTag as HTMLImageElement).src;
        } else {
            return null;
        }
    }

    function parseCurrentQuestion(): Question {
        let question: Question;
        const questionType = getCurrentQuestionType();

        if (questionType === "openLong" || questionType === "openShort") {
            question = {
                answerType: questionType == "openLong" ? "long" : "short",
                content: (document.querySelector(".question_essence") as HTMLElement).innerText,
                imageAttachmentUrl: getImageAttachmentUrl()
            }
        } else if (questionType === "closedSingleChoice" || questionType === "closedMultipleChoice") {
            const answerElements = document.querySelectorAll(".answer_container");
            const answerElementsArray = Array.prototype.slice.call(answerElements);
            question = {
                answerType: questionType === "closedSingleChoice" ? "singleChoice" : "multipleChoices",
                content: (document.querySelector(".question_essence") as HTMLElement).innerText,
                possibleAnswers: answerElementsArray.map((elem: HTMLElement) => elem.innerText),
                possibleAnswersImages: answerElementsArray.map((elem: HTMLElement) => {
                    const img = elem.querySelector("img");
                    return img ? img.src : null;
                }),
                imageAttachmentUrl: getImageAttachmentUrl()
            }
        }

        return question;
    }

    function displayStealthAnswer(question: Question, answer: Answer) {
        if (question.answerType === "singleChoice" || question.answerType === "multipleChoices") {
            const answerElements = document.querySelectorAll(".answer_container");
            const answerElementsArray = Array.prototype.slice.call(answerElements);
            const correctNums = (answer as ClosedQuestionAnswer).correctAnswerIndices;
            
            answerElementsArray.forEach((elem: HTMLElement, idx: number) => {
                if (correctNums.includes(idx)) {
                    elem.style.backgroundColor = "rgba(16, 185, 129, 0.06)";
                    elem.style.border = "1px solid rgba(16, 185, 129, 0.35)";
                    elem.style.borderRadius = "8px";
                    elem.style.padding = "6px";
                    elem.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
                    
                    if (!elem.querySelector(".stealth-badge")) {
                        const badge = document.createElement("span");
                        badge.className = "stealth-badge";
                        badge.style.display = "inline-flex";
                        badge.style.alignItems = "center";
                        badge.style.gap = "4px";
                        badge.style.fontSize = "11px";
                        badge.style.color = "#10b981";
                        badge.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
                        badge.style.border = "1px solid rgba(16, 185, 129, 0.15)";
                        badge.style.padding = "2px 6px";
                        badge.style.borderRadius = "4px";
                        badge.style.fontWeight = "600";
                        badge.style.marginLeft = "10px";
                        badge.style.verticalAlign = "middle";
                        badge.innerHTML = `
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; display:block;">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            AI Choice
                        `;
                        elem.appendChild(badge);
                    }
                }
            });
        }

        const targetContainer = document.querySelector(".question_answers") || document.querySelector(".question_essence");
        if (targetContainer) {
            const existingBox = document.querySelector(".stealth-answer-box");
            if (existingBox) {
                existingBox.remove();
            }

            const answerBox = document.createElement("div");
            answerBox.className = "stealth-answer-box";
            answerBox.style.marginTop = "15px";
            answerBox.style.padding = "14px 18px";
            answerBox.style.backgroundColor = "rgba(17, 24, 39, 0.95)";
            answerBox.style.color = "#e2e8f0";
            answerBox.style.borderRadius = "10px";
            answerBox.style.border = "1px solid rgba(99, 102, 241, 0.25)";
            answerBox.style.fontSize = "13px";
            answerBox.style.lineHeight = "1.5";
            answerBox.style.whiteSpace = "pre-wrap";
            answerBox.style.backdropFilter = "blur(8px)";
            answerBox.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";

            const title = document.createElement("div");
            title.style.display = "flex";
            title.style.alignItems = "center";
            title.style.justifyContent = "space-between";
            title.style.fontWeight = "600";
            title.style.fontSize = "12px";
            title.style.textTransform = "uppercase";
            title.style.letterSpacing = "0.05em";
            title.style.marginBottom = "8px";
            title.style.color = "#818cf8";
            
            const titleTextContainer = document.createElement("div");
            titleTextContainer.style.display = "flex";
            titleTextContainer.style.alignItems = "center";
            titleTextContainer.style.gap = "6px";
            titleTextContainer.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                    <path d="M9 18h6M10 22h4"/>
                </svg>
                <span>AI Suggested Answer</span>
            `;
            title.appendChild(titleTextContainer);

            const copyBtn = document.createElement("button");
            copyBtn.innerText = "Copy";
            copyBtn.style.background = "none";
            copyBtn.style.border = "none";
            copyBtn.style.color = "#a5b4fc";
            copyBtn.style.cursor = "pointer";
            copyBtn.style.fontSize = "10px";
            copyBtn.style.fontWeight = "600";
            copyBtn.style.padding = "2px 6px";
            copyBtn.style.borderRadius = "4px";
            copyBtn.style.transition = "all 0.2s ease";
            copyBtn.addEventListener("mouseenter", () => {
                copyBtn.style.backgroundColor = "rgba(99, 102, 241, 0.15)";
            });
            copyBtn.addEventListener("mouseleave", () => {
                copyBtn.style.backgroundColor = "transparent";
            });

            const answerTextToCopy = (question.answerType === "singleChoice" || question.answerType === "multipleChoices")
                ? (answer as ClosedQuestionAnswer).correctAnswerIndices.map(idx => (question as ClosedQuestion).possibleAnswers[idx]).join("\n")
                : (answer as OpenQuestionAnswer).content;

            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(answerTextToCopy);
                copyBtn.innerText = "Copied!";
                setTimeout(() => {
                    copyBtn.innerText = "Copy";
                }, 1500);
            });
            title.appendChild(copyBtn);

            const content = document.createElement("div");
            content.style.color = "#f1f5f9";
            content.style.fontWeight = "500";
            if (question.answerType === "singleChoice" || question.answerType === "multipleChoices") {
                const correctNums = (answer as ClosedQuestionAnswer).correctAnswerIndices;
                const correctTextList = correctNums.map(idx => {
                    const text = (question as ClosedQuestion).possibleAnswers[idx];
                    return `${idx + 1}. ${text}`;
                });
                content.innerText = `Suggested Option(s):\n${correctTextList.join("\n")}`;
            } else {
                content.innerText = (answer as OpenQuestionAnswer).content;
            }

            answerBox.appendChild(title);
            answerBox.appendChild(content);
            targetContainer.appendChild(answerBox);
        }
    }

    async function autoSolveCurrentQuestion(event?: MouseEvent) {
        if (event) event.preventDefault();
        setLoading(true);
        const currentQuestion: Question = parseCurrentQuestion();
        let currentQuestionAnswer: Answer;

        try {
            currentQuestionAnswer = await generateAnswer(currentQuestion);
            
            if (pluginConfig.solveMode === SolveMode.STEALTH) {
                displayStealthAnswer(currentQuestion, currentQuestionAnswer);
            } else {
                if (currentQuestion.answerType === "long") {
                    const answerFrame = document.getElementById("givenAnswer_ifr") as HTMLIFrameElement;
                    const answerFrameDoc = answerFrame.contentDocument ? answerFrame.contentDocument : answerFrame.contentWindow.document;
                    answerFrameDoc.body.innerHTML = (currentQuestionAnswer as OpenQuestionAnswer).content;
                } else if (currentQuestion.answerType === "short") {
                    const answerInput = document.querySelector(".mdc-text-field__input") as HTMLInputElement;
                    answerInput.value = (currentQuestionAnswer as OpenQuestionAnswer).content;
                } else if (currentQuestion.answerType === "singleChoice") {
                    const answerRadios = document.querySelectorAll("#questionForm input[type='radio']") as NodeListOf<HTMLInputElement>;
                    const correctNum = (currentQuestionAnswer as ClosedQuestionAnswer).correctAnswerIndices[0];
                    answerRadios[correctNum].checked = true;
                } else if (currentQuestion.answerType === "multipleChoices") {
                    const answerCheckboxes = document.querySelectorAll("#questionForm input[type='checkbox']") as NodeListOf<HTMLInputElement>;
                    const correctNums = (currentQuestionAnswer as ClosedQuestionAnswer).correctAnswerIndices;
                    for (let i = 0; i < answerCheckboxes.length; i++) {
                        answerCheckboxes[i].checked = correctNums.includes(i);
                    }
                }
            }
        } catch (error: any) {
            console.error(error.toString());
            const errorText = error?.message ?? t("apiError");
            toast(errorText, { type: "error" });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (pluginConfig.solveMode === SolveMode.STEALTH && !hasRunAuto && !isLoading) {
            setHasRunAuto(true);
            const timer = setTimeout(() => {
                autoSolveCurrentQuestion();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [pluginConfig.solveMode, hasRunAuto]);

    let stealthStyle: CSSProperties = {};
    if (pluginConfig.btnVisibility === AutoSolveButtonVisibility.BARELY_VISIBLE) {
        stealthStyle = { opacity: 0.05 };
    } else if (pluginConfig.btnVisibility === AutoSolveButtonVisibility.NOT_VISIBLE) {
        stealthStyle = { opacity: 0 };
    }

    return <>
        <button style={stealthStyle}
            className={"mdc-button mdc-button--outlined"} onClick={autoSolveCurrentQuestion}
            disabled={isLoading}>
            <span style={{ fontWeight: "normal" }}>
                {isLoading ? t("solving") : t("autoSolve")}
            </span>
        </button>

        <ToastContainer />
    </>;
}

// Mount auto-solve button only on the exam solving subpage.
const isExamSolvingSubpage = document.querySelector(".question_header_content") !== null;
if (isExamSolvingSubpage) {
    const mountNode = document.createElement("span");
    const anchorPoint1 = document.querySelectorAll(".navigation_buttons")[0];
    const anchorPoint2 = document.querySelectorAll(".test_button_box.section")[0];
    const anchorPoint = anchorPoint1 || anchorPoint2;
    anchorPoint.appendChild(mountNode)
    const root = createRoot(mountNode)
    root.render(<TestportalAutoSolve />);
}

export default () => null;
