# Agent Planning and Task Decomposition

Turn a goal into a structured plan, validate it, then execute the tasks in dependency order. The model plans; your code checks the plan and runs it.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your OPENAI_API_KEY
python main.py
```

Set `OPENAI_MODEL` in `.env` to override the default `gpt-4o-mini`. The report is written to `output/comparison.md`.

## Build it in this order

1. Write the tools in `tools.py`: `research_frameworks` returns mock data for LangGraph, AutoGen and CrewAI, and `write_report` writes a Markdown table to `output/`. Give each one a Pydantic args model.
2. Define `Task` and `Plan` in `main.py`. A task has an `id`, a `tool` limited to the two tool names and a `depends_on` list.
3. Expose the tools to the model with `pydantic_function_tool`, and keep a `TOOL_FUNCTIONS` allowlist for execution.
4. Write `create_plan`: call `client.responses.parse` with `text_format=Plan` and `tool_choice="none"`, so the model returns a plan and calls no tools.
5. Write `validate_plan` to reject duplicate IDs, self-dependencies, unknown dependencies and cycles before anything runs.
6. Write `execute_plan` to run tasks whose dependencies are done, validate the arguments with the Pydantic models and pass research results into the report task.
7. In `main`, plan, print the plan, execute it and print the results.

## Assignment

- [ ] **Parallel execution:** Run all ready tasks at once with `ThreadPoolExecutor` instead of one at a time.
- [ ] **Replanning:** When a task fails, send the error and the completed results back to the model and ask for a revised plan.
- [ ] **Real research:** Replace the mock `FRAMEWORKS` data with a web search tool and let the plan pick any framework.
- [ ] **Plan tests:** Assert that `validate_plan` rejects a cycle, a duplicate ID and an unknown dependency.
