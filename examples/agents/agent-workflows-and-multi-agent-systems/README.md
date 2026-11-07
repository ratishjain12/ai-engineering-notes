# Agent Workflows and Multi-Agent Systems

A LangGraph research pipeline: three researchers run in parallel, then an analyst, a writer and a reviewer. All agents communicate through one shared state, and the graph decides who runs next.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY
python main.py
```

Set `OPENAI_MODEL` in `.env` to override the default `gpt-4o-mini`.

## Build it in this order

1. Define `State` as a `TypedDict`: topic, research, analysis, report, approved, feedback, revisions.
2. Give `research` a reducer (`Annotated[list[str], operator.add]`) so parallel researchers append to it.
3. Write each agent as a node that reads the state and returns only the keys it owns.
4. Wire the graph: `START` to every researcher, all researchers to the analyst, then analyst, writer, reviewer.
5. Add a conditional edge after the reviewer: back to the writer, or `END` when approved or out of revisions.
6. Compile and invoke with the initial state.

## Try it

- Read the `[agent] done` lines: the researchers finish in any order, and the analyst starts only after all three.
- Make the reviewer stricter and watch the writer revise from `feedback` in the state.
- Set `MAX_REVISIONS = 0` and see the first draft go out.
- Remove the reducer from `research` and see what the parallel researchers do to each other's output.

## Assignment

- [ ] **Conditional step:** Skip the analyst when only one framework is given.
- [ ] **Message format:** Replace the shared `research` list with `{sender, receiver, task, content}` messages in the state.
- [ ] **Failure handling:** Retry a failed researcher once, then continue with the findings you have.
- [ ] **Human review:** Add a LangGraph interrupt before the final report is returned.
