UNFOLD

UnFold is an AI-powered document intelligence platform that turns
dense documents into clear, useful insights. Upload a document, unfold
it with AI, explore its summary and insights, and chat with the document
using questions grounded in its content.

Features

Document upload and text extraction

AI-powered document analysis

Short, medium, and long summary modes

Key points and insight mapping

Document-grounded AI chat

Detection of questions unrelated to the uploaded document

Persistent chat history while switching between Upload and Chat

Expandable chat view

Processing progress feedback

Tech Stack

Frontend

React

Vite

JavaScript

CSS

Backend

Node.js

Express.js

CORS

dotenv

AI

Google Gemini API

@google/genai

Deployment

Vercel --- Frontend

Render --- Backend

Project Structure

Doc_Summary/
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── chat_style.css
│   │   ├── documentProcessor.js
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── server.js
│   ├── package.json
│   └── .env
└── README.md

Getting Started

Clone

git clone https://github.com/Nehasree-s/UnFold.git
cd UnFold

Frontend

cd client
npm install
npm run dev

Backend

In a separate terminal:

cd server
npm install
npm start

The backend runs on http://localhost:5000.

If a development script is configured in server/package.json, you can
use:

npm run dev

Environment Variables

Create server/.env:

GEMINI_API_KEY=your_gemini_api_key

Never expose the Gemini API key in the frontend or commit the .env
file.

API

POST /api/summarize

Analyzes extracted document text and returns a structured AI response
containing:

Summary

Key points

Improvement suggestions

Insight map

Example body:

{
  "text": "Document text...",
  "length": "medium"
}

POST /api/chat

Answers questions using the uploaded document as the source of truth. If
the document does not contain relevant information, the application
responds accordingly rather than inventing an answer.

How It Works

Upload Document
      ↓
Extract Text
      ↓
Unfold / Analyze
      ↓
Summary + Key Points + Insights
      ↓
Ask Questions
      ↓
Document-Grounded AI Answer

Deployment

The frontend is deployed on Vercel and the backend is deployed on
Render.

Production backend:

https://unfold-v9xc.onrender.com

For production, frontend API requests should point to the deployed
backend.

Design Principles

Clarity --- Turn dense documents into information that is easier to
understand.

Grounding --- Keep AI answers tied to the uploaded document.

Simplicity --- Provide a clean interface without unnecessary
controls.

Future Improvements

Better mathematical/LaTeX rendering

More document formats

Improved document search and retrieval

Conversation export

Authentication and saved documents

Page-level references and citations

Author

Nehasree Samudrala

Built as an AI-powered document intelligence project.

UnFold --- Document intelligence, made simple.
