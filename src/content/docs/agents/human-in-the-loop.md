---
title: Human-in-the-Loop (HITL)
description: How an agent pauses at a checkpoint, waits for a human to approve, reject or change an action, and resumes, plus a runnable approval gate for a refund agent.
date: 2026-11-02T06:30:00Z
related: [agents/tool-calling, agents/agent-loop, agents/planning-and-task-decomposition]
---

An AI agent can perform tasks without human help.

But some tasks need human input or approval.

Human-in-the-Loop (HITL) is a design pattern where an agent pauses its work and waits for a human to make a decision.

The agent continues after it receives the human response.

## Why do we need it?

An agent can make mistakes.

For example, an agent may:

- Send an email to the wrong person.
- Delete an important file.
- Approve an incorrect payment.
- Produce a report with incorrect information.

We should not allow an agent to perform every action without control.

HITL gives humans control over important decisions.

## How does it work?

1. **Agent starts a task**
   The agent receives a request and prepares an action.
2. **Agent reaches a checkpoint**
   The agent identifies that the action needs human approval.
3. **Agent pauses**
   It saves its current state and waits.
4. **Human makes a decision**
   The human approves, rejects, or provides more information.
5. **Agent resumes**
   The agent continues based on the human's decision.

## Three common use cases

### Approval

The agent prepares an action and waits for approval.

Example: An agent prepares an email. It sends the email only after a human approves it.

### Missing information

The agent asks a question when it does not have enough information.

Example: A travel agent asks for the user's budget before booking a hotel.

### Human review

The agent produces an output and waits for a human to review it.

Example: An agent generates a financial report. A human checks the report before it is shared.

## What happens inside the agent?

HITL requires more than a simple confirmation message.

The application must manage the agent's execution state.

```text
RUNNING
   |
   v
WAITING_FOR_APPROVAL
   |
   v
HUMAN_DECISION
   |
   +---- APPROVED ----> RESUME
   |
   +---- REJECTED ----> STOP
   |
   +---- CHANGES -----> UPDATE AND RESUME
```

The application must also handle:

- Saving the current state.
- Waiting for a human response.
- Resuming the correct task.
- Handling rejected actions.
- Handling approval timeouts.

HITL allows an agent to work autonomously while keeping humans in control of important decisions.

The goal is not to remove autonomy. The goal is to make autonomy safe.

## Hands-on Exercise

In this exercise, you will build a customer support agent that can look up orders on its own but must get a human's approval before it issues a refund.

https://github.com/ratishjain12/ai-engineering-notes/tree/main/examples/agents/human-in-the-loop

The example demonstrates:

1. Run read-only [tools](/agents/tool-calling/) freely and list the risky ones in `REQUIRES_APPROVAL`.
2. Pause before a risky tool and show the human the pending call.
3. Approve the call, reject it with feedback, or edit its arguments field by field.
4. Return the rejection or the edit to the model as the tool output, so it can explain the outcome or change course.

The approval check lives in the code that executes tools, not in the prompt. The model cannot skip it.
