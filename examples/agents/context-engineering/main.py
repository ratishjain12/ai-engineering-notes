from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI()

SYSTEM_PROMPT = """
You are a backend engineering assistant.
Give practical answers based on the project context.
"""

MAX_HISTORY_MESSAGES = 5

def build_context(system_prompt, history, user_message, project_state):
    messages = [{"role": "system", "content": system_prompt}]

    messages.append({
        "role": "system",
        "content": f"Project state: {project_state}"
    })

    messages.extend(history[-MAX_HISTORY_MESSAGES:])
    messages.append({"role": "user", "content": user_message})
    return messages

def ask_model(messages):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )
    return response.choices[0].message.content

def main():
    project_state = {
        "language": "Python",
        "database": "PostgreSQL",
        "requirements": [
            "Build a REST API",
            "Support asynchronous operations",
        ],
    }

    history = [
        {"role": "user", "content": "I am learning Python."},
        {"role": "assistant", "content": "Great. What are you building?"},
        {"role": "user", "content": "I need a REST API."},
        {"role": "assistant", "content": "Which database will you use?"},
        {"role": "user", "content": "I will use PostgreSQL."},
        {"role": "assistant", "content": "What are your performance needs?"},
        {"role": "user", "content": "It must support async operations."},
    ]

    user_message = "Can you provide a code snippet for an async REST API using FastAPI and PostgreSQL?"
    context = build_context(SYSTEM_PROMPT, history, user_message, project_state)

    for message in context:
        print(f"\n[{message['role'].upper()}]")
        print(message["content"])

    answer = ask_model(context)

    print("\nAssistant:")
    print(answer)

if __name__ == "__main__":
    main()