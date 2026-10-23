import json
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI()

MEMORY_FILE = Path(__file__).parent / "memory.json"
MAX_MEMORIES = 3

SYSTEM_PROMPT = """
You are a helpful assistant.
Use the user's saved memories when they are relevant. Do not mention the memory store.
"""

EXTRACT_PROMPT = """
You maintain a long-term memory for a user. Read the user's message and decide what to change.

Existing memory keys: {keys}

Return JSON: {{"save": [{{"key": "...", "value": "..."}}], "forget": ["..."]}}

Rules:
- Save only durable facts or preferences about the user, not questions or small talk.
- Reuse an existing key when the new fact replaces it, so the old value is overwritten.
- Put a key in "forget" only when the user asks to forget or remove it. Use an existing key.
- Return empty lists when nothing needs to change.
"""

def load_memories():
    if not MEMORY_FILE.exists():
        return {}
    return json.loads(MEMORY_FILE.read_text())

def write_memories(memories):
    MEMORY_FILE.write_text(json.dumps(memories, indent=2))

def save_memory(key, value):
    memories = load_memories()
    memories[key] = {
        "value": value,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    write_memories(memories)

def delete_memory(key):
    memories = load_memories()
    if memories.pop(key, None) is not None:
        write_memories(memories)

def extract_memory_changes(user_message):
    keys = list(load_memories())
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EXTRACT_PROMPT.format(keys=keys)},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)

def apply_changes(changes):
    existing = load_memories()

    for item in changes.get("save", []):
        action = "update" if item["key"] in existing else "save"
        save_memory(item["key"], item["value"])
        print(f"  [{action}] {item['key']} = {item['value']}")

    for key in changes.get("forget", []):
        if key in existing:
            delete_memory(key)
            print(f"  [forget] {key}")

def words(text):
    return set(re.findall(r"[a-z0-9]+", text.lower()))

def retrieve_memories(query, limit=MAX_MEMORIES):
    query_words = words(query)
    scored = []
    for key, memory in load_memories().items():
        score = len(query_words & words(f"{key} {memory['value']}"))
        if score > 0:
            scored.append((score, key, memory["value"]))
    scored.sort(reverse=True)
    return [(key, value) for _, key, value in scored[:limit]]

def build_messages(user_message, memories):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if memories:
        lines = "\n".join(f"- {key}: {value}" for key, value in memories)
        messages.append({"role": "system", "content": f"Saved memories:\n{lines}"})

    messages.append({"role": "user", "content": user_message})
    return messages

def ask_model(messages):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=300,
    )
    return response.choices[0].message.content

def chat(user_message):
    print(f"\nUser: {user_message}")

    print("Extract:")
    apply_changes(extract_memory_changes(user_message))

    memories = retrieve_memories(user_message)
    print(f"Retrieved: {memories}")

    print(f"Assistant: {ask_model(build_messages(user_message, memories))}")

def main():
    MEMORY_FILE.unlink(missing_ok=True)

    print("=== Session 1: extract ===")
    chat("Hi! I'm a backend dev. I mostly write Python and my database is MySQL.")
    chat("I prefer short answers with type hints.")

    print("\n=== Session 2: retrieve (only memory.json carries over) ===")
    chat("Write a function that reads all rows from my database.")

    print("\n=== Session 3: update ===")
    chat("Actually, I migrated my database to PostgreSQL.")
    chat("Write a function that reads all rows from my database.")

    print("\n=== Session 4: forget ===")
    chat("Forget my database, I don't want you to remember it.")
    chat("Write a function that reads all rows from my database.")

    print(f"\nFinal memory: {json.dumps(load_memories(), indent=2)}")

if __name__ == "__main__":
    main()
