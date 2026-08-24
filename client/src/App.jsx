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
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { extractText } from "./documentProcessor";
import "./App.css";

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

  const generateSummary = async () => {
    if (!extractedText) return;

    setIsSummarizing(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/summarize", {
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
              "Areas that could use more evidence, explanation, or context.",
            points:
              summary.missingPoints?.slice(0, 3) ||
              summary.gaps?.slice(0, 3) ||
              summary.questions?.slice(0, 3) ||
              summary.improvementSuggestions?.slice(0, 3) ||
              [],
          },
        ]
      : [];

  const insightMap =
    summary?.insightMap?.length > 0 ? summary.insightMap : fallbackInsightMap;

  const selectedInsight = insightMap[activeInsight] || insightMap[0];

  const insightLensLabels = [
    "KEY IDEAS",
    "THINGS TO CHECK",
    "GAPS TO CONSIDER",
  ];

  return (
    <>
      <style>{`
        /* Unfold concept-map redesign: quieter, editorial, less "AI dashboard" */
        .unfold-map-card {
          overflow: hidden;
          background: #fffdfa;
          border-color: #e7dfdc;
          box-shadow: 0 18px 45px rgba(75, 59, 52, 0.06);
        }

        .unfold-map-header {
          margin-bottom: 28px;
        }

        .unfold-map-header h2 {
          margin-bottom: 7px;
          letter-spacing: -0.025em;
        }

        .unfold-map-header p {
          max-width: 680px;
        }

        .unfold-map-header-icon {
          display: none;
        }

        .unfold-map {
          position: relative;
          padding: 8px 8px 2px;
        }

        .map-center {
          width: min(300px, 90%);
          min-height: 70px;
          margin: 0 auto;
          padding: 12px 18px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid #ded4d0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 7px 18px rgba(75, 59, 52, 0.05);
          position: relative;
          z-index: 2;
        }

        .map-center-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: #6f5b7c;
          background: #f0e9f4;
          flex: 0 0 auto;
        }

        .map-center div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .map-center span {
          font-size: 9px;
          line-height: 1;
          letter-spacing: .13em;
          font-weight: 750;
          color: #a0959b;
        }

        .map-center strong {
          font-size: 16px;
          font-weight: 700;
          color: #332f35;
        }

        .map-connector-main {
          width: 1px;
          height: 24px;
          margin: 0 auto;
          background: #cfc3be;
        }

        .map-branches {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          padding-top: 18px;
        }

        .map-branches::before {
          content: "";
          position: absolute;
          top: 0;
          left: 16.666%;
          right: 16.666%;
          height: 1px;
          background: #cfc3be;
        }

        .map-branch-wrap {
          position: relative;
          padding-top: 0;
        }

        .map-connector-branch {
          position: absolute;
          top: -18px;
          left: 50%;
          width: 1px;
          height: 18px;
          background: #cfc3be;
        }

        .map-branch {
          width: 100%;
          min-height: 112px;
          padding: 18px 17px;
          border: 1px solid #e3dbd7;
          border-radius: 13px;
          background: #fff;
          color: inherit;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          text-align: left;
          cursor: pointer;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
          box-sizing: border-box;
          font: inherit;
          box-shadow: 0 5px 16px rgba(75, 59, 52, 0.035);
        }

        .map-branch:hover {
          transform: translateY(-1px);
          border-color: #cdbfc0;
          box-shadow: 0 10px 22px rgba(75, 59, 52, .07);
        }

        .map-branch.active {
          background: #fbf7ff;
          border-color: #bda7d0;
          box-shadow: 0 9px 22px rgba(111, 82, 126, .08);
        }

        .map-branch.challenge.active {
          background: #fff8f2;
          border-color: #dfb99f;
        }

        .map-branch-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          color: #725d7d;
          background: #f1ebf4;
        }

        .map-branch.challenge .map-branch-icon {
          color: #ad7453;
          background: #f9e9df;
        }

        .map-branch-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 1px;
        }

        .map-branch-copy small {
          font-size: 9px;
          line-height: 1.2;
          letter-spacing: .12em;
          font-weight: 750;
          color: #9a9096;
        }

        .map-branch-copy strong {
          font-size: 15px;
          line-height: 1.3;
          font-weight: 700;
          color: #363138;
        }

        .map-branch-copy em {
          font-style: normal;
          font-size: 11px;
          color: #a2979c;
        }

        .map-branch-arrow {
          margin-left: auto;
          color: #9a8e95;
          font-size: 17px;
          line-height: 1;
          padding-top: 1px;
        }

        .map-selected-panel {
          margin-top: 22px;
          padding: 22px 24px 20px;
          border: 1px solid #e5ddda;
          border-radius: 14px;
          background: #fcfaf9;
        }

        .map-selected-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .map-selected-heading h3 {
          margin: 5px 0 0;
          letter-spacing: -0.015em;
        }

        .map-selected-panel .detail-description {
          margin: 12px 0 15px;
        }

        .map-selected-panel .detail-count {
          background: #fff;
          border-color: #e2d9d6;
        }

        .insight-point {
          border-color: #ebe3df !important;
          background: #fff !important;
          border-radius: 10px !important;
        }

        .map-footer {
          display: none;
        }

        .result-grid {
          display: none !important;
        }

        @media (max-width: 850px) {
          .map-branches {
            grid-template-columns: 1fr;
            gap: 10px;
            padding-top: 0;
          }

          .map-branches::before,
          .map-connector-branch {
            display: none;
          }

          .map-branch { min-height: 92px; }
        }

        @media (max-width: 560px) {
          .unfold-map { padding-left: 0; padding-right: 0; }
          .map-center { width: 100%; }
          .map-selected-panel { padding: 17px; }
          .map-selected-heading { flex-direction: column; gap: 8px; }
        }
      `}</style>
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
              <span className="section-kicker">START HERE</span>
              <span className="file-limit">MAX 10 MB</span>
            </div>

            {!file ? (
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
                  <Search size={17} />
                  {isProcessing
                    ? `Reading document · ${progress}%`
                    : "Unfold this document"}
                </button>

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

            <div className="insight-map-card unfold-map-card">
              <div className="insight-header unfold-map-header">
                <div>
                  <span className="section-kicker">DOCUMENT MAP</span>
                  <h2>What stands out in this document?</h2>
                  <p>
                    Follow the three branches to see the main ideas, things worth
                    checking, and gaps worth considering.
                  </p>
                </div>

                <div className="insight-header-icon unfold-map-header-icon">
                  <Network size={22} />
                </div>
              </div>

              <div className="unfold-map">
                <div className="map-center">
                  <div className="map-center-icon">
                    <FileText size={19} />
                  </div>
                  <div>
                    <span>DOCUMENT</span>
                    <strong>Core ideas</strong>
                  </div>
                </div>

                <div className="map-connector map-connector-main" />

                <div className="map-branches">
                  {insightMap.map((insight, index) => {
                    const active = activeInsight === index;
                    const isChallenge =
                      insight.title?.toLowerCase().includes("watch") ||
                      insight.title?.toLowerCase().includes("risk") ||
                      insight.title?.toLowerCase().includes("challenge");

                    const branchIcon =
                      isChallenge ? (
                        <AlertTriangle size={17} />
                      ) : index === 2 ? (
                        <Lightbulb size={17} />
                      ) : (
                        <Target size={17} />
                      );

                    return (
                      <div className="map-branch-wrap" key={index}>
                        <div className="map-connector map-connector-branch" />

                        <button
                          type="button"
                          onClick={() => setActiveInsight(index)}
                          className={`map-branch ${active ? "active" : ""} ${
                            isChallenge ? "challenge" : ""
                          }`}
                        >
                          <span className="map-branch-icon">{branchIcon}</span>

                          <span className="map-branch-copy">
                            <small>{insightLensLabels[index] || "MORE CONTEXT"}</small>
                            <strong>{insight.title}</strong>
                            <em>
                              {insight.points?.length || 0} key points
                            </em>
                          </span>

                          <span className="map-branch-arrow">
                            {active ? "−" : "+"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedInsight && (
                <div className="map-selected-panel">
                  <div className="map-selected-heading">
                    <div>
                      <span className="detail-kicker">
                        {insightLensLabels[activeInsight] || selectedInsight.eyebrow || "SELECTED LENS"}
                      </span>
                      <h3>{selectedInsight.title}</h3>
                    </div>

                    <span className="detail-count">
                      {selectedInsight.points?.length || 0} key points
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
                Three perspectives • one document
              </div>
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
    </>
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