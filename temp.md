# AI-Powered Note Making Features

This document outlines the core AI features and standout ideas for the note-making application, detailing their implementation and how they simplify the learning process for students.

## 0. Core Feature: Automated Note Generation
**How we are implementing it:**
- **Frontend:** A user inputs their Gemini API key which is stored securely (e.g., in `localStorage`). A button next to a video triggers the process.
- **Backend:** We use a library like `youtube-transcript` to extract the video's text transcript. 
- **AI Processing:** We send the transcript to the Gemini API via the `@google/genai` SDK with a strict system prompt (e.g., "Act as an expert tutor. Summarize this transcript into detailed notes with headings and bullet points").
- **Display:** The returned Markdown text is saved to our JSON datastore and rendered as a beautiful, readable note box below the video.

**How it simplifies note-making:**
Instead of pausing the video every 30 seconds to type out what the instructor said, the student gets a comprehensive, perfectly formatted summary instantly. They can spend their time actually *learning* and watching, rather than frantically transcribing.

## 1. Chat with the Video (Interactive Q&A)
**How we are implementing it:**
- **Frontend:** A chat interface alongside the video player or notes section.
- **Backend/AI:** When a user asks a question, we send the question *along with the video transcript* to Gemini. The prompt will instruct Gemini to "Answer the user's question using ONLY the provided transcript."
- **How it simplifies note-making:**
If a student misses a concept or doesn't understand a part of the AI-generated notes, they don't have to re-watch the video or Google it. They just ask the AI, turning passive notes into an interactive, personalized tutor. It clarifies confusion instantly without breaking the flow of study.

## 2. Auto-Generated Flashcards & Spaced Repetition
**How we are implementing it:**
- **AI Processing:** We run a secondary prompt against the transcript or the generated notes, asking Gemini to "Extract 10 key terms/concepts and provide a concise definition for each in a JSON array."
- **Frontend:** We render these JSON objects into interactive digital flashcards (Question on front, Answer on back) directly below the notes.
- **How it simplifies note-making:**
Creating flashcards manually takes hours and is a tedious part of note-making. By automating this, students immediately get actionable study material designed for active recall, skipping the creation phase entirely and jumping straight into memorization.

## 4. Post-Video Knowledge Check (Quizzes)
**How we are implementing it:**
- **AI Processing:** Similar to flashcards, we prompt Gemini to generate a 5-question multiple-choice quiz based on the transcript, formatted as JSON (question, options, correct answer, explanation).
- **Frontend:** A "Test My Knowledge" button that opens a quiz modal. After answering, it shows the score and explains why answers were right or wrong based on the video.
- **How it simplifies note-making:**
Notes are only useful if you remember them. By immediately testing the student, it solidifies the knowledge. It transforms the app from a passive storage system into an active learning platform, ensuring the notes actually result in retention.

## 6. Mind-Mapping / Visual Summaries
**How we are implementing it:**
- **AI Processing:** We prompt Gemini to analyze the transcript and return a hierarchical JSON structure representing the core topics and subtopics (e.g., Topic A -> Subtopic 1, Subtopic 2).
- **Frontend:** We use a library like `react-flow` or `mermaid.js` to parse this JSON and render a visual web/flowchart of the video's concepts.
- **How it simplifies note-making:**
Visual learners struggle with traditional text-based notes. A mind-map instantly shows how different concepts connect to one another. It gives a 10,000-foot view of the lecture in seconds, which would otherwise take a student a long time to manually draw out.

## 7. Multi-Lingual Study
**How we are implementing it:**
- **Frontend:** A language dropdown menu (e.g., English, Spanish, Hindi, French) above the notes generation button.
- **AI Processing:** When calling Gemini, we append to the prompt: "...and translate the final notes into [Selected Language]."
- **How it simplifies note-making:**
For international students, translating complex academic English into their native language while taking notes is incredibly mentally taxing. This feature eliminates that language barrier completely, providing them perfectly structured notes in their most comfortable language.
