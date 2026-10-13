# Agent Loop

A minimal agent loop in plain Python with a mock model. No API keys, no dependencies.

## How it works

`run_agent(task, max_steps=5)` repeats until the model gives a final answer:

1. Send the message history to the model.
2. If the model returns a `tool_call`, run the tool and append the result as a `tool` message.
3. If the model returns `final`, return its content.
4. If `max_steps` is reached without a final answer, raise `RuntimeError`.

`mock_model` stands in for a real LLM: it requests the `calculator` tool on the first turn, then returns a final answer once it sees the tool result.

## Run

```bash
python main.py
```

Expected output:

```
The result is 30.
```

## Assignment

- Add a second tool named multiply.
- Allow the agent to call either tool.
- Return an error when the model requests an unknown tool.
- Test what happens when the model never returns a final answer.
