# Agent Memory

Give an assistant memory that survives between sessions: save facts, retrieve the relevant ones later, update a preference and include the memories in the prompt.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY
python main.py
```

## Build it in this order

1. Store memories in `memory.json` as `key: {value, updated_at}` so they outlive the process.
2. Write `save_memory` and `delete_memory`. Saving an existing key overwrites it, which is how an update works.
3. Write `extract_memory_changes`: send the user message and the existing keys to the model and get back JSON with `save` and `forget` lists.
4. Write `apply_changes` to run those changes and print each `save`, `update` or `forget`.
5. Write `retrieve_memories` to score memories by word overlap with the query and return the top `MAX_MEMORIES`.
6. Write `build_messages` to add the retrieved memories as a system message before the user message.
7. Write `chat` to extract, retrieve, then answer. In `main`, run the sessions in order: extract, retrieve, update, forget.

## Assignment

- [ ] **Better retrieval:** Replace word overlap with embeddings and cosine similarity so "my database" matches "PostgreSQL".
- [ ] **Expiry:** Use `updated_at` to expire memories that have not been touched in N days.
- [ ] **Conflicts:** When a new fact contradicts a saved one under a different key, detect it and replace the old one.
- [ ] **Memory tests:** Assert that an update replaces the old value, that a forgotten key is gone and that irrelevant memories are not retrieved.
