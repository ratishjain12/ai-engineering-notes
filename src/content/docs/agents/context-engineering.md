---
title: Context Engineering
description: How to select, organize and update the information an LLM receives, from recent-message selection to summarization, retrieval and structured state.
date: 2026-10-21T12:29:00Z
related: [agents/agent-memory, agents/tool-calling, agents/agent-loop]
---

An LLM generates a response from the information that it receives.

This information is called **context**.

Context can include:

- System instructions
- The user's message
- Previous messages
- Tool definitions
- Tool results
- Retrieved documents
- Information about the current task

**Context engineering is the process of selecting, organizing, and updating this information so the LLM can complete a task.**

## **Why Do We Need Context Engineering?**

An LLM does not automatically know the state of your application.

It may not know what the user asked earlier. It may not have access to the results of a previous tool call. It may also lack information about the user's current task.

Your application must provide the required information.

Consider this request:

Compare FastAPI and Flask for my next project.

The LLM can explain both frameworks. However, the best recommendation depends on the project.

Suppose the application has these details:

- The project is a backend API.
- The API must support asynchronous operations.
- The developer already knows Python.
- The project must be easy to maintain.

Your application can include these details in the context.

The LLM can then use them to produce a more relevant answer.

Without this information, the LLM may give a general comparison that does not address the user's needs.

## **What Goes Into the Context?**

An application can send different types of information to an LLM.

### **System instructions**

System instructions define the model's role and rules.

For example:

```
You are a backend engineering assistant.
Explain technical concepts in simple language.
Consider the project's requirements before making recommendations.
```

### **User messages**

User messages contain the user's requests and information.

```
Compare FastAPI and Flask for my next project.
```

### **Conversation history**

Conversation history contains earlier messages from the user and the assistant.

It helps the model understand references to earlier parts of the conversation.

For example:

```
User: I am building a REST API.
Assistant: What database will you use?
User: PostgreSQL.
```

If the user later asks, "Which framework should I use?", the earlier messages provide useful context.

### **Tool definitions and results**

Tool definitions describe the functions that the model can request.

Tool results contain the output of those functions.

For example, a search tool may return documentation about FastAPI and Flask. Your application can include the relevant results in the context.

### Retrieved information

An application can retrieve information from documents, databases, or a vector database.

It can then include relevant information in the context.

This is a common part of Retrieval-Augmented Generation (RAG).

## **Why Should We Not Send Everything?**

The context window limits how much information a model can process in one request.

The limit includes input tokens and, depending on the model, the tokens reserved for the output.

Large contexts can also increase cost and latency.

Sending irrelevant information can make it harder for the model to identify important details.

## **How Do We Build the Right Context?**

A context builder prepares the information that the application sends to the model.

A simple process has four steps.

1. **Collect information.** Get the user's request, relevant history, instructions, and available tool results.
2. **Select information.** Keep the information that is useful for the current task.
3. **Organize information.** Place instructions, messages, and supporting data in the appropriate structure.
4. **Check the context.** Remove unnecessary data and keep the request within the model's limits.

## **Context Engineering in Code**

Consider a simple application that stores conversation messages.

The application should not always send the entire conversation to the model.

It can select the most recent messages first.

```python
def build_context(system_prompt, history, user_message):
    messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    messages.extend(history[-5:])

    messages.append({
        "role": "user",
        "content": user_message
    })

    return messages
```

Example:

```python
system_prompt = (
    "You are a helpful backend engineering assistant."
)

history = [
    {"role": "user", "content": "I use Python."},
    {"role": "assistant", "content": "Understood."},
    {"role": "user", "content": "I need a REST API."},
    {"role": "assistant", "content": "What database will you use?"},
    {"role": "user", "content": "PostgreSQL."},
    {"role": "assistant", "content": "What are your performance needs?"}
]

user_message = "Which Python framework should I use?"

messages = build_context(
    system_prompt,
    history,
    user_message
)
```

The function keeps the system prompt, the five most recent history messages, and the current user message.

This is a basic example. It does not check token usage or decide which messages are most relevant.

**Important:** Keeping the most recent messages is a simple context management strategy. It is not always the best strategy. An older message may contain information that is still important.

## **Common Context Management Strategies**

Different tasks need different strategies.

### **Recent message selection**

Keep the most recent messages.

This is simple to implement. However, it can remove important information from earlier in the conversation.

### **Summarization**

Replace a long conversation with a shorter summary.

For example:

```
The user is building a FastAPI service.
The database is PostgreSQL.
The API needs asynchronous operations.
The user prefers simple deployment.
```

The model can use this summary without receiving every earlier message.

However, a summary may omit important details. Your application should preserve critical facts.

### Retrieval

Search for information that is relevant to the current request.

For example, a coding assistant can retrieve the documentation for a function before answering a question about it.

This is useful when the application has many documents or a large knowledge base.

### Structured state

Store important facts in a structured format.

```python
project_state = {
    "language": "Python",
    "framework": "FastAPI",
    "database": "PostgreSQL",
    "deployment": "Docker"
}
```

Your application can include the required fields in later requests.

This can be more reliable than extracting every important fact from a long conversation.

## **Context Engineering and Memory**

Context and memory are related, but they are not the same.

**[Memory](/agents/agent-memory/)** is information that an application stores for future use.

**Context** is the information that the application provides to the model for a particular request.

For example, an application may store a user's preferred programming language in a database.

When the user asks a coding question, the application can retrieve that preference and include it in the context.

The stored preference is memory. The information sent to the model is context.

Not every stored fact needs to be included in every request.

## **Context Engineering and Tool Calling**

[Tool calling](/agents/tool-calling/) and context engineering work together.

Tool calling allows the model to request actions. Context engineering provides the information needed to choose and use those actions.

Consider an application that has a search tool.

1. The user asks a question.
2. The application sends the request and the tool definition to the model.
3. The model requests a search.
4. The application executes the search.
5. The application sends the search result back to the model.
6. The model uses the result to prepare an answer.

The tool result becomes part of the context for the next model call.

Your application must decide how much of that result to include. A large result may need filtering or summarization

## **Common Mistakes**

Avoid these mistakes when building LLM applications:

- Sending the entire conversation on every request without checking its size.
- Removing old messages without preserving important facts.
- Including large tool results that are not relevant to the task.
- Treating a summary as a complete record of the conversation.
- Storing information but never retrieving it when needed.
- Adding retrieved content without checking its relevance.
- Assuming that more context always produces a better answer.

## **Hands-On Exercise**

https://github.com/ratishjain12/ai-engineering-notes/tree/main/examples/agents/context-engineering

Build a context builder for a simple AI assistant.

The application must:

1. Store conversation history.
2. Keep a system prompt.
3. Select relevant messages for each request.
4. Limit the amount of history sent to the model.
5. Summarize older messages when the history becomes too long.
6. Preserve important project details.
7. Print the final context before sending it to the model.

Start with recent message selection. Then add summarization or retrieval.

Test the application with a conversation that contains at least 20 messages.

Ask a question that depends on an older message. Check whether the model receives the information that it needs.

## **Success Criteria**

The application should keep the context relevant to the current task. It should not lose important information when the conversation becomes long.
