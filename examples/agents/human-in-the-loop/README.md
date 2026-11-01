# Human in the Loop

A support agent that can look up orders freely but must get a human's approval before it issues a refund. The model proposes; a person decides.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY
python main.py
```

Set `OPENAI_MODEL` in `.env` to override the default `gpt-4o-mini`.

## Build it in this order

1. Write two tools: `lookup_order` (read-only) and `issue_refund` (irreversible). Give each a Pydantic args model.
2. Put the tools in a `TOOLS` table and list the risky ones in `REQUIRES_APPROVAL`.
3. Write `ask_human`: show the pending call and return a `Decision` of approve, reject (with feedback) or edit (prompt for each field, Enter keeps the current value).
4. Write `execute_tool`: validate the arguments, ask the human for risky tools, then run, skip or run the edited call.
5. Return rejections and edits to the model as the tool output, so it can explain the outcome or change course.
6. Run the usual agent loop, with `execute_tool` as the only place tools run.

## Try it

- Approve: the refund runs.
- Reject with "only refund half": the model adapts instead of retrying.
- Edit the amount to `60`: the model reports the edited amount.

## Assignment

- [ ] **Risk tiers:** Only require approval for refunds above $50.
- [ ] **Audit log:** Append every decision, with a timestamp, to `decisions.jsonl`.
- [ ] **Async approval:** Save pending calls to disk and resume the run when a reviewer answers, instead of blocking on `input()`.
- [ ] **Approval tests:** Assert that a rejected refund never calls `issue_refund`.
