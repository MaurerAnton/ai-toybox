# AI-TOYBOX

A collection of AI-powered browser toys. Each is a single HTML file that uses the shared `core/` AI communication module (extracted from [teletraan-1](https://github.com/MaurerAnton/teletraan-1)).

No Python. No build step. No dependencies. Just open `index.html`.

## Projects

| # | Name | What it does | Link |
|---|------|-------------|------|
| 34 | **BOOKFORGE** | Nonexistent book generator — LLM + SVG cover + HTML/PDF | [bookforge/](bookforge/) |
| 72 | **ALIEN** | Explain everyday concepts to an alien, get scored | [alien/](alien/) |
| 73 | **HOBBY** | Rare hobby simulator — "day in the life" generator | [hobby/](hobby/) |
| 24 | **CLI-LOG** | Shell command logger + daily AI analysis | [cli-log/](cli-log/) |
| 112 | **CHARFORGE** | RPG character builder with AI backstory + JSON export | [charforge/](charforge/) |

## Setup

1. Open any project's `index.html` in a browser
2. Click **CONFIG** to set your LLM endpoint, model, and API key
3. Works with any OpenAI-compatible API (DeepSeek, OpenAI, Ollama, llama.cpp, etc.)

For **CLI-LOG**, also add the hook to your shell:
```bash
echo 'source ~/ai-toybox/cli-log/hook.sh' >> ~/.bashrc
```

## Architecture

```
core/
  ai-core.js    — LLM communication (streaming, tool calls)
  config.js     — localStorage config panel
  theme.css     — Cybertronian dark theme
```

Each project is a self-contained `index.html` that includes the core files via relative paths.

## Tech Stack

- Vanilla JS (ES6+, async/await)
- HTML5 + CSS3
- SVG generation (book covers)
- Web Audio API (future)
- No frameworks, no npm, no build step

## License

MIT
