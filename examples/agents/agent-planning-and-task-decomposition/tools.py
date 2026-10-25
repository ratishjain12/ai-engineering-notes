
from pathlib import Path

from pydantic import BaseModel, Field


FRAMEWORKS = {
    "LangGraph": {
        "focus": "Stateful, graph-based agent workflows",
        "strength": "Explicit control over state and execution flow",
        "tradeoff": "Requires more setup and graph design",
    },
    "AutoGen": {
        "focus": "Applications with collaborating agents",
        "strength": "Supports multi-agent conversations",
        "tradeoff": "Coordination can add complexity",
    },
    "CrewAI": {
        "focus": "Role-based agents and task workflows",
        "strength": "Simple abstractions for agent teams",
        "tradeoff": "Role-based workflows may not fit every use case",
    },
}


# Pydantic schemas for function-tool arguments
class ResearchArgs(BaseModel):
    frameworks: list[str] = Field(
        description="Framework names to research. "
        "Choose from LangGraph, AutoGen, and CrewAI."
    )


class WriteReportArgs(BaseModel):
    filename: str = Field(
        description="Output filename inside the output directory, "
        "for example comparison.md"
    )


def research_frameworks(frameworks: list[str]) -> dict:
    results = {}

    for name in frameworks:
        if name not in FRAMEWORKS:
            raise ValueError(f"Unknown framework: {name}")

        results[name] = FRAMEWORKS[name]

    if not results:
        raise ValueError("At least one framework must be provided.")

    return results


def write_report(research: dict, filename: str) -> dict:
    if not research:
        raise ValueError("No research results are available.")

    # Accept only a filename, not an arbitrary filesystem path.
    if Path(filename).name != filename or filename in {"", ".", ".."}:
        raise ValueError("Provide a filename, not a path.")

    if not filename.endswith(".md"):
        raise ValueError("The report filename must end in .md.")

    path = Path("output") / filename
    path.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# AI Agent Framework Comparison",
        "",
        "> Generated from mock research data.",
        "",
        "| Framework | Focus | Strength | Trade-off |",
        "|---|---|---|---|",
    ]

    for name, details in research.items():
        values = [
            name,
            details["focus"],
            details["strength"],
            details["tradeoff"],
        ]
        values = [value.replace("|", "\\|") for value in values]
        lines.append("| " + " | ".join(values) + " |")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {
        "path": str(path),
        "frameworks": list(research.keys()),
    }
