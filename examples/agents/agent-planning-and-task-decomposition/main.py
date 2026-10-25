
import os
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI, pydantic_function_tool
from pydantic import BaseModel, Field

from tools import (
    ResearchArgs,
    WriteReportArgs,
    research_frameworks,
    write_report,
)

load_dotenv()

client = OpenAI()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# Structured plan

class Task(BaseModel):
    id: str
    description: str
    tool: Literal["research_frameworks", "write_report"]
    depends_on: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    filename: str = "comparison.md"


class Plan(BaseModel):
    tasks: list[Task]


# Pydantic-generated function-tool schemas

API_TOOLS = [
    pydantic_function_tool(
        ResearchArgs,
        name="research_frameworks",
        description="Research the supported AI agent frameworks.",
    ),
    pydantic_function_tool(
        WriteReportArgs,
        name="write_report",
        description="Write a Markdown comparison report.",
    ),
]

# Application-side execution allowlist
TOOL_FUNCTIONS = {
    "research_frameworks": research_frameworks,
    "write_report": write_report,
}


def create_plan(goal: str) -> Plan:
    response = client.responses.parse(
        model=MODEL,
        instructions="""
You are a task planner.

Create a short, executable plan for the user's goal.

Rules:
- Use only the tools research_frameworks and write_report.
- Research must finish before the report is written.
- Use unique task IDs.
- Every dependency must refer to another task ID.
- Choose framework names only from LangGraph, AutoGen, and CrewAI.
- Use comparison.md as the report filename.
- Do not add unnecessary tasks.
""",
        input=goal,
        text_format=Plan,
        tools=API_TOOLS,
        tool_choice="none",
    )

    plan = response.output_parsed

    if plan is None or not plan.tasks:
        raise RuntimeError("The model did not return a valid plan.")

    validate_plan(plan)
    return plan


def validate_plan(plan: Plan) -> None:
    task_ids = [task.id for task in plan.tasks]

    if len(task_ids) != len(set(task_ids)):
        raise ValueError("Task IDs must be unique.")

    known_ids = set(task_ids)

    for task in plan.tasks:
        if task.id in task.depends_on:
            raise ValueError(f"Task {task.id} depends on itself.")

        unknown = set(task.depends_on) - known_ids
        if unknown:
            raise ValueError(
                f"Task {task.id} has unknown dependencies: {unknown}"
            )

    # Detect cycles before executing anything.
    completed = set()
    pending = list(plan.tasks)

    while pending:
        ready = [
            task for task in pending
            if set(task.depends_on) <= completed
        ]

        if not ready:
            raise ValueError("The plan contains a dependency cycle.")

        for task in ready:
            completed.add(task.id)
            pending.remove(task)


def execute_plan(plan: Plan) -> dict:
    completed = set()
    results = {}
    pending = list(plan.tasks)

    while pending:
        ready = [
            task for task in pending
            if set(task.depends_on) <= completed
        ]

        if not ready:
            raise RuntimeError("No executable tasks remain.")

        # Run one task at a time for predictable ordering.
        task = ready[0]

        print(f"\nRunning {task.id}: {task.description}")

        if task.tool == "research_frameworks":
            # Validate the arguments before execution.
            args = ResearchArgs(frameworks=task.frameworks)
            result = TOOL_FUNCTIONS[task.tool](args.frameworks)
            results[task.id] = result

        elif task.tool == "write_report":
            research_results = [
                results[dependency]
                for dependency in task.depends_on
                if dependency in results
                and isinstance(results[dependency], dict)
                and results[dependency]
                and all(
                    isinstance(value, dict)
                    and "focus" in value
                    for value in results[dependency].values()
                )
            ]

            if not research_results:
                raise RuntimeError(
                    "The report task has no completed research dependency."
                )

            args = WriteReportArgs(filename=task.filename)
            result = TOOL_FUNCTIONS[task.tool](
                research_results[0],
                args.filename,
            )
            results[task.id] = result

        completed.add(task.id)
        pending.remove(task)

        print(f"Completed {task.id}: {result}")

    return results


def main() -> None:
    goal = (
        "Compare LangGraph, AutoGen, and CrewAI, "
        "then write a Markdown comparison report."
    )

    plan = create_plan(goal)

    print("\nGenerated plan:")
    for task in plan.tasks:
        print(
            f"- {task.id}: {task.description} "
            f"(depends on: {task.depends_on})"
        )

    results = execute_plan(plan)

    print("\nAll tasks completed.")
    print(results)


if __name__ == "__main__":
    main()
