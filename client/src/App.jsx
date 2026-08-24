import { useRef, useState } from "react";
import {
  FileText,
  Upload,
  BookOpen,
  FileSearch,
  AlignLeft,
  Search,
  ShieldCheck,
  X,
  Network,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Layers3,
  MessageCircle,
  Send,
  Bot,
  User,
  LoaderCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { extractText } from "./documentProcessor";
import "./App.css";
import "./chat_style.css";

function App() {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");

  const [summaryLength, setSummaryLength] = useState("medium");
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [activeInsight, setActiveInsight] = useState(0);

  // Switches the upload panel between document upload and document chat.
  const [activeMode, setActiveMode] = useState("upload");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  const generateSummary = async () => {
    if (!extractedText) return;

    setIsSummarizing(true);
    setError("");

    try {
      const response = await fetch("https://unfold-v9xc.onrender.com/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          length: summaryLength,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary.");
      }

      setSummary(data);
      setActiveInsight(0);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Something went wrong while generating the summary."
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const sendChatMessage = async () => {
    const question = chatInput.trim();

    if (!question || !extractedText || isChatting) return;

    if (question.length > 1000) {
      setError("Please keep your question under 1000 characters.");
      return;
    }

    setError("");
    setChatInput("");

    const userMessage = {
      role: "user",
      content: question,
    };

    const historyForRequest = chatMessages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setChatMessages((messages) => [...messages, userMessage]);
    setIsChatting(true);

    try {
      const response = await fetch("https://unfold-v9xc.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          question,
          history: historyForRequest,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to answer the question.");
      }

      setChatMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content:
            data.related === false
              ? "This document doesn't contain anything related to that."
              : data.answer ||
                "I couldn't find enough information about that in this document.",
          isUnavailable: data.related === false,
        },
      ]);
    } catch (err) {
      console.error(err);
      setChatMessages((messages) => [
        ...messages,
        {
          role: "assistant",
          content:
            err.message ||
            "I couldn't answer that right now. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const extractImageText = async (imageFile) => {
    let worker;

    try {
      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });

      const result = await worker.recognize(imageFile);
      return result.data.text;
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  };

  const analyzeDocument = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError("");
    setExtractedText("");
    setSummary(null);
    setChatMessages([]);
    setChatInput("");
    setActiveMode("upload");

    try {
      let text = "";

      if (file.type === "application/pdf") {
        text = await extractText(file, setProgress);
      } else if (
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg"
      ) {
        text = await extractImageText(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG."
        );
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No readable text was found in this document.");
      }

      setExtractedText(text);
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Something went wrong while processing the document."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];

  const handleFile = (selectedFile) => {
    setError("");
    setSummary(null);
    setExtractedText("");
    setActiveInsight(0);
    setChatMessages([]);
    setChatInput("");
    setActiveMode("upload");

    if (!selectedFile) return;

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, PNG, JPG, or JPEG file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleFileInput = (event) => {
    handleFile(event.target.files[0]);
  };

  const removeFile = () => {
    setFile(null);
    setError("");
    setExtractedText("");
    setSummary(null);
    setProgress(0);
    setActiveInsight(0);
    setChatMessages([]);
    setChatInput("");
    setActiveMode("upload");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fallbackInsightMap =
    summary?.keyPoints?.length > 0
      ? [
          {
            title: "What the document says",
            eyebrow: "UNDERSTANDING",
            description: "The main ideas that the document puts forward.",
            points: summary.keyPoints.slice(0, 3),
          },
          {
            title: "What to watch",
            eyebrow: "CRITICAL VIEW",
            description:
              "Important limitations, risks, tensions, or concerns found in the document.",
            points: summary.improvementSuggestions?.slice(0, 3) || [],
          },
          {
            title: "What's missing",
            eyebrow: "GAP DETECTION",
            description:
              "Useful areas that could be explored further to make the discussion stronger.",
            points:
              summary.improvementSuggestions?.slice(0, 3) || [],
          },
        ]
      : [];

  const insightMap =
    summary?.insightMap?.length > 0 ? summary.insightMap : fallbackInsightMap;

  const selectedInsight = insightMap[activeInsight] || insightMap[0];

  return (
    <div className="unfold-app">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">
              <BookOpen size={20} strokeWidth={2.1} />
            </div>

            <div>
              <div className="brand-name">UNFOLD</div>
              <div className="brand-tagline">
                Document intelligence, made simple.
              </div>
            </div>
          </div>

          <div className="header-status">
            <span className="status-dot" />
            AI-powered analysis
          </div>
        </div>
      </header>

      <main className="page-shell">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow-pill">
              <FileSearch size={14} />
              DOCUMENT INTELLIGENCE
            </div>

            <h1>
              Your documents,
              <span> understood differently.</span>
            </h1>

            <p>
              Unfold turns dense documents into a clear story — what matters,
              what to question, and what may be missing.
            </p>

            <div className="hero-mini-stats">
              <div>
                <span className="mini-icon mint">
                  <FileText size={15} />
                </span>
                PDF & image ready
              </div>
              <div>
                <span className="mini-icon peach">
                  <AlignLeft size={15} />
                </span>
                AI summaries
              </div>
              <div>
                <span className="mini-icon lavender">
                  <Network size={15} />
                </span>
                Insight mapping
              </div>
            </div>
          </div>

          <div
            className={`upload-card ${isDragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="upload-card-top">
              <span className="section-kicker">{activeMode === "chat" ? "ASK YOUR DOCUMENT" : "START HERE"}</span>

              {extractedText ? (
                <div className="mode-switcher" aria-label="Document mode">
                  <button
                    type="button"
                    onClick={() => setActiveMode("upload")}
                    className={activeMode === "upload" ? "active" : ""}
                  >
                    <Upload size={13} />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("chat")}
                    className={activeMode === "chat" ? "active" : ""}
                  >
                    <MessageCircle size={13} />
                    Chat
                  </button>
                </div>
              ) : (
                <span className="file-limit">MAX 10 MB</span>
              )}
            </div>

            {activeMode === "chat" && extractedText ? (
              <div className={`document-chat ${isChatExpanded ? "chat-expanded" : ""}`}>
                <div className="chat-intro">
                  <div className="chat-intro-icon">
                    <Bot size={19} />
                  </div>

                  <div className="chat-intro-copy">
                    <strong>Ask about this document</strong>
                    <p>
                      Ask questions about the uploaded document. Answers stay
                      grounded in what it contains.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="chat-expand-button"
                    onClick={() => setIsChatExpanded((expanded) => !expanded)}
                    aria-label={isChatExpanded ? "Collapse chat" : "Extend chat"}
                  >
                    {isChatExpanded ? (
                      <>
                        <Minimize2 size={14} />
                        Collapse
                      </>
                    ) : (
                      <>
                        <Maximize2 size={14} />
                        Extend
                      </>
                    )}
                  </button>
                </div>

                <div className="chat-messages" aria-live="polite">
                  {chatMessages.length === 0 ? (
                    <div className="chat-empty">
                      <MessageCircle size={20} />
                      <span>Try asking about a concept, section, finding, or conclusion.</span>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`chat-message ${message.role} ${
                          message.isUnavailable ? "unavailable" : ""
                        } ${message.isError ? "error" : ""}`}
                      >
                        <span className="chat-avatar">
                          {message.role === "assistant" ? (
                            <Bot size={14} />
                          ) : (
                            <User size={14} />
                          )}
                        </span>
                        <p>{message.content}</p>
                      </div>
                    ))
                  )}

                  {isChatting && (
                    <div className="chat-message assistant">
                      <span className="chat-avatar">
                        <Bot size={14} />
                      </span>
                      <p className="chat-thinking">
                        <LoaderCircle size={15} className="spin" />
                        Reading the document...
                      </p>
                    </div>
                  )}
                </div>

                <div className="chat-composer">
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Ask something about this document..."
                    maxLength={1000}
                    rows={2}
                    disabled={isChatting}
                    aria-label="Ask about the document"
                  />
                  <button
                    type="button"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isChatting}
                    className="chat-send"
                    aria-label="Send question"
                  >
                    <Send size={16} />
                  </button>
                </div>

                <div className="chat-hint">
                  Press Enter to send · Shift + Enter for a new line
                </div>
              </div>
            ) : !file ? (
              <>
                <div className="upload-visual">
                  <div className="upload-icon">
                    <Upload size={25} />
                  </div>
                  <div className="upload-orbit orbit-one" />
                  <div className="upload-orbit orbit-two" />
                </div>

                <h2>Drop a document here</h2>
                <p>or browse your device to choose a PDF or scanned image</p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="primary-button"
                >
                  <Upload size={17} />
                  Choose document
                  <ArrowUpRight size={16} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileInput}
                  className="hidden-input"
                />

                <div className="supported-files">
                  PDF <span>•</span> PNG <span>•</span> JPG <span>•</span> JPEG
                </div>
              </>
            ) : (
              <div className="selected-file">
                <div className="file-row">
                  <div className="file-type-icon">
                    <FileText size={23} />
                  </div>

                  <div className="file-info">
                    <strong>{file.name}</strong>
                    <span>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to
                      unfold
                    </span>
                  </div>

                  <button
                    onClick={removeFile}
                    className="icon-button"
                    aria-label="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>

                <button
                  onClick={analyzeDocument}
                  disabled={isProcessing}
                  className="primary-button analyze-button"
                >
                  {!extractedText && <Search size={17} />}

                  {isProcessing
                    ? `Reading document · ${progress}%`
                    : extractedText
                    ? "Document unfolded ✓"
                    : "Unfold this document"}
                </button>

                {extractedText && !isProcessing && (
                  <div className="chat-discovery-hint">
                    <strong>✨ Want to ask your document something?</strong>
                    <span>
                      Chat with your document using the <b>Chat</b> option above ↑
                    </span>
                  </div>
                )}

                {isProcessing && (
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {error && <div className="error-box">{error}</div>}

        {extractedText && (
          <section className="analysis-controls">
            <div>
              <span className="section-kicker">AI ANALYSIS</span>
              <h2>Choose your summary depth</h2>
              <p>
                Unfold has read your document. Tell it how much detail you
                want.
              </p>
            </div>

            <div className="summary-control-right">
              <div className="depth-switcher">
                {["short", "medium", "long"].map((length) => (
                  <button
                    key={length}
                    onClick={() => setSummaryLength(length)}
                    className={summaryLength === length ? "active" : ""}
                  >
                    {length}
                  </button>
                ))}
              </div>

              <button
                onClick={generateSummary}
                disabled={isSummarizing}
                className="secondary-button"
              >
                <Search size={16} />
                {isSummarizing ? "Unfolding..." : "Generate insights"}
              </button>
            </div>
          </section>
        )}

        {summary && (
          <section className="results-section">
            <div className="results-heading">
              <div>
                <span className="section-kicker">YOUR DOCUMENT, UNFOLDED</span>
                <h2>Here’s what stands out.</h2>
              </div>

              <div className="result-badge">
                <span className="status-dot" />
                Analysis complete
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-label">
                <span className="summary-icon">
                  <FileText size={18} />
                </span>
                <span>IN ONE VIEW</span>
              </div>

              <p>{summary.summary}</p>
            </div>

            <div className="insight-map-card">
              <div className="insight-header">
                <div>
                  <span className="section-kicker">THE THINKING LAYER</span>
                  <h2>Insight Map</h2>
                  <p>
                    Instead of hiding the analysis in long sections, explore
                    the document through three different lenses.
                  </p>
                </div>

                <div className="insight-header-icon">
                  <Network size={22} />
                </div>
              </div>

              <div className="insight-tabs">
                {insightMap.map((insight, index) => {
                  const active = activeInsight === index;
                  const isChallenge =
                    insight.title?.toLowerCase().includes("watch") ||
                    insight.title?.toLowerCase().includes("risk") ||
                    insight.title?.toLowerCase().includes("challenge");

                  return (
                    <button
                      key={index}
                      onClick={() => setActiveInsight(index)}
                      className={`insight-tab ${active ? "active" : ""} ${
                        isChallenge ? "challenge" : ""
                      }`}
                    >
                      <span className="tab-icon">
                        {isChallenge ? (
                          <AlertTriangle size={18} />
                        ) : index === 2 ? (
                          <Lightbulb size={18} />
                        ) : (
                          <Target size={18} />
                        )}
                      </span>

                      <span className="tab-copy">
                        <small>
                          {insight.eyebrow ||
                            (index === 0
                              ? "UNDERSTANDING"
                              : index === 1
                              ? "CRITICAL VIEW"
                              : "GAP DETECTION")}
                        </small>
                        <strong>{insight.title}</strong>
                        <em>{insight.points?.length || 0} connected insights</em>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedInsight && (
                <div className="insight-detail">
                  <div className="detail-heading">
                    <div>
                      <span className="detail-kicker">
                        {selectedInsight.eyebrow || "CONNECTED INSIGHTS"}
                      </span>
                      <h3>{selectedInsight.title}</h3>
                    </div>

                    <span className="detail-count">
                      {selectedInsight.points?.length || 0} points
                    </span>
                  </div>

                  {selectedInsight.description && (
                    <p className="detail-description">
                      {selectedInsight.description}
                    </p>
                  )}

                  <div className="insight-points">
                    {selectedInsight.points?.map((point, pointIndex) => (
                      <div className="insight-point" key={pointIndex}>
                        <span>
                          <CheckCircle2 size={16} />
                        </span>
                        <p>{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="map-footer">
                <Layers3 size={14} />
                AI-generated perspective map
              </div>
            </div>

            <div className="result-grid">
              <ResultCard
                className="key-points-card"
                icon={<Target size={19} />}
                label="KEY TAKEAWAYS"
                title="What should you remember?"
                items={summary.keyPoints || []}
              />

              <ResultCard
                className="suggestions-card"
                icon={<Lightbulb size={19} />}
                label="NEXT LENS"
                title="Where could the document go further?"
                items={summary.improvementSuggestions || []}
              />
            </div>
          </section>
        )}

        {!summary && !extractedText && (
          <section className="feature-strip">
            <Feature
              icon={<FileText size={18} />}
              title="Extract"
              text="Read text from PDFs and scanned images."
              tone="mint"
            />

            <Feature
              icon={<FileText size={18} />}
              title="Understand"
              text="Turn dense content into a focused summary."
              tone="lavender"
            />

            <Feature
              icon={<ShieldCheck size={18} />}
              title="Question"
              text="Surface gaps, risks, and useful next perspectives."
              tone="peach"
            />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>UNFOLD</span>
        <span>Document intelligence, made simple.</span>
      </footer>
    </div>
  );
}

function ResultCard({ icon, label, title, items, className = "" }) {
  return (
    <article className={`result-card ${className}`}>
      <div className="result-card-icon">{icon}</div>
      <span className="section-kicker">{label}</span>
      <h3>{title}</h3>

      <ul>
        {items.map((item, index) => (
          <li key={index}>
            <span className="bullet" />
            <p>{item}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Feature({ icon, title, text, tone }) {
  return (
    <div className="feature-card">
      <div className={`feature-icon ${tone}`}>{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default App;
