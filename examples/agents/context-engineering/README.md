# Context Engineering

Build the context a model sees on each request: system prompt, project state, recent history and the new user message.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY
python main.py
```

## Build it in this order

1. Create the OpenAI client and load the API key from `.env`.
2. Write a system prompt that sets the assistant's role.
3. Define the project state (language, database, requirements) as a dict.
4. Write `build_context` to combine the system prompt, project state, the last `MAX_HISTORY_MESSAGES` messages and the user message.
5. Print the built context so you can see exactly what the model receives.
6. Write `ask_model` to send the context to the model and return the answer.
7. Print the answer.

## Assignment

- [ ] **Token budget:** Limit context by estimated token count, not only message count. Estimate tokens per message (for example `len(text) // 4`, or `tiktoken`), then drop the oldest messages until the context fits a `MAX_CONTEXT_TOKENS` budget. Always keep the system prompt and the new user message.
- [ ] **Relevant history:** Preserve important older details when they are needed. With `MAX_HISTORY_MESSAGES = 5`, the first message ("I am learning Python.") is dropped. Keep older messages that match the current question, for example by keyword overlap, so a fact like "I will use PostgreSQL" survives when it is still relevant.
- [ ] **Summarization:** Summarize older messages instead of dropping them without replacement. Send the messages that fall outside the budget to the model, ask for a short summary, and insert it as a message before the recent history.
- [ ] **Context tests:** Check that required facts are present before sending a request. Write a function that asserts the built context contains the required facts (`PostgreSQL`, `async`, `REST API`) and raises if any is missing. Add a test where a small budget drops a fact, and confirm the check catches it.
