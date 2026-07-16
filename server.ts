import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  // Cloud Run / AI Studio inject the port to listen on; 3000 is the local fallback.
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // API wrapper for external providers
  app.post("/api/ai", async (req, res) => {
    const { provider, model, prompt, systemPrompt, apiKey, baseUrl } = req.body;
    
    try {
      if (provider === "google") {
          const m = model || "gemini-2.5-flash";
          // AI Studio injects GEMINI_API_KEY server-side, so a key pasted in the UI is optional.
          const key = apiKey || process.env.GEMINI_API_KEY;
          if (!key) return res.status(400).json({ error: "No Google API key provided and GEMINI_API_KEY is not set on the server." });
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  systemInstruction: systemPrompt ? { parts: [{text: systemPrompt}] } : undefined,
              })
          });
          const data = await response.json();
          if (!response.ok) return res.status(response.status).json(data);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return res.json({ text });
      } else if (provider === "openrouter") {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                  model: model || "openai/gpt-3.5-turbo",
                  messages: [
                      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                      { role: "user", content: prompt }
                  ]
              })
          });
          const data = await response.json();
          if (!response.ok) return res.status(response.status).json(data);
          const text = data.choices?.[0]?.message?.content || "";
          return res.json({ text });
      } else if (provider === "ollama") {
          // If the user deployed this, the backend might reach their external URL.
          // But if they are running Ollama locally, the frontend is better suited to call it.
          // We proxy here anyway just in case the backend can reach it.
          const endpoint = baseUrl || "http://127.0.0.1:11434";
          const response = await fetch(`${endpoint}/api/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  model: model || "llama3",
                  prompt: prompt,
                  system: systemPrompt,
                  stream: false
              })
          });
          const data = await response.json();
          if (!response.ok) return res.status(response.status).json(data);
          return res.json({ text: data.response });
      }
      res.status(400).json({ error: "Unknown provider" });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
