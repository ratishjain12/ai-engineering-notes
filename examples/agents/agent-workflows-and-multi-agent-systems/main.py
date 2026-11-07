import operator
import os
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

client = OpenAI()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_REVISIONS = 2

NOTES = {
    "langgraph": "LangGraph models a workflow as a graph of nodes and edges with shared state and conditional edges. Good for branching flows. Steeper learning curve.",
    "crewai": "CrewAI organises work as agents, tasks and crews. Quick to start for role-based pipelines. Less control over low-level execution.",
    "custom": "Plain Python orchestration: functions calling agents in order. No dependency, full control, easy to debug. You write state and retry logic yourself.",
}

FRAMEWORKS = list(NOTES)


# Shared state: every agent reads from it and writes back to it.
# `research` has a reducer, so parallel researchers append instead of overwriting each other.

class State(TypedDict):
    topic: str
    research: Annotated[list[str], operator.add]
    analysis: str
    report: str
    approved: bool
    feedback: str
    revisions: int


def ask(instructions, prompt):
    response = client.responses.create(model=MODEL, instructions=instructions, input=prompt)
    return response.output_text


# Agents: each node returns only the keys it owns

def make_researcher(framework):
    def researcher(state: State):
        text = ask(
            "You are a researcher. Reply with 2-3 bullet points of facts, using only the notes given.",
            f"Framework: {framework}\nNotes: {NOTES[framework]}",
        )
        print(f"[researcher:{framework}] done")
        return {"research": [f"{framework}:\n{text}"]}

    return researcher


def analyst(state: State):
    analysis = ask(
        "You are an analyst. Compare the findings and recommend one framework for a small team. Give the reasoning in 3-4 sentences.",
        f"Topic: {state['topic']}\n\n" + "\n\n".join(state["research"]),
    )
    print("[analyst] done")
    return {"analysis": analysis}


def writer(state: State):
    prompt = state["analysis"]
    if state.get("feedback"):
        prompt = f"Report:\n{state['report']}\n\nReviewer feedback:\n{state['feedback']}"

    report = ask(
        "You are a writer. Turn the analysis into a short report with a title and three sections. If reviewer feedback is given, fix exactly what it asks.",
        prompt,
    )
    print("[writer] done")
    return {"report": report}


class Review(BaseModel):
    approved: bool
    feedback: str = Field(description="What to fix. Empty if approved.")


def reviewer(state: State):
    response = client.responses.parse(
        model=MODEL,
        instructions="You are a reviewer. Approve only if the report has a title, a clear recommendation and a stated trade-off. Otherwise say what is missing.",
        input=state["report"],
        text_format=Review,
    )
    review = response.output_parsed
    print(f"[reviewer] approved={review.approved} {review.feedback}")
    return {"approved": review.approved, "feedback": review.feedback, "revisions": state["revisions"] + 1}


def route_after_review(state: State):
    if state["approved"] or state["revisions"] > MAX_REVISIONS:
        return END
    return "writer"


# Orchestration: the graph decides who runs, in what order, and when to stop

graph = StateGraph(State)

for fw in FRAMEWORKS:
    graph.add_node(f"researcher_{fw}", make_researcher(fw))
    graph.add_edge(START, f"researcher_{fw}")  # parallel fan-out

graph.add_node("analyst", analyst)
graph.add_node("writer", writer)
graph.add_node("reviewer", reviewer)

graph.add_edge([f"researcher_{fw}" for fw in FRAMEWORKS], "analyst")  # waits for all researchers
graph.add_edge("analyst", "writer")
graph.add_edge("writer", "reviewer")
graph.add_conditional_edges("reviewer", route_after_review, [END, "writer"])  # revise loop

app = graph.compile()


if __name__ == "__main__":
    final = app.invoke(
        {"topic": "Which agent framework should we use?", "research": [], "feedback": "", "revisions": 0}
    )
    print(final["report"])
