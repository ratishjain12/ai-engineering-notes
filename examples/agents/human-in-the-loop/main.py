import json
import os
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI, pydantic_function_tool
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

client = OpenAI()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

ORDERS = {
    "A100": {"customer": "Priya", "item": "Mechanical keyboard", "total": 120.0, "status": "delivered"},
    "B200": {"customer": "Sam", "item": "USB-C hub", "total": 45.0, "status": "delivered"},
}


# Tools

class LookupOrderArgs(BaseModel):
    order_id: str = Field(description="The order ID, for example A100.")


class IssueRefundArgs(BaseModel):
    order_id: str
    amount: float = Field(description="Refund amount in USD.")
    reason: str


def lookup_order(order_id):
    return ORDERS.get(order_id, "Order not found.")


def issue_refund(order_id, amount, reason):
    return f"Refunded ${amount:.2f} for order {order_id} ({reason})."


def to_responses_tool(params, name, description):
    return {"type": "function", **pydantic_function_tool(params, name=name, description=description)["function"]}


TOOLS = {
    "lookup_order": (lookup_order, LookupOrderArgs),
    "issue_refund": (issue_refund, IssueRefundArgs),
}

# Read-only tools run freely. Anything that moves money waits for a human.
REQUIRES_APPROVAL = {"issue_refund"}

tool_schemas = [
    to_responses_tool(LookupOrderArgs, "lookup_order", "Look up an order by ID."),
    to_responses_tool(IssueRefundArgs, "issue_refund", "Refund money to the customer. Irreversible."),
]

SYSTEM_PROMPT = """You are a customer support agent.
Look up the order before refunding it. Never refund more than the order total.
If a refund is rejected, do not retry the same refund. Follow the reviewer's feedback and tell the customer what happened."""


# Human gate

class Decision(BaseModel):
    verdict: Literal["approve", "reject", "edit"]
    args: dict | None = None
    feedback: str = ""


def ask_human(name, args) -> Decision:
    print(f"\nThe agent wants to run: {name}")
    print(json.dumps(args, indent=2))

    while True:
        choice = input("[a]pprove / [r]eject / [e]dit args > ").strip().lower()

        if choice == "a":
            return Decision(verdict="approve")

        if choice == "r":
            return Decision(verdict="reject", feedback=input("Why? > ").strip())

        if choice == "e":
            print("Press Enter to keep the current value.")
            edited = {}
            for field, current in args.items():
                value = input(f"{field} [{current}] > ").strip()
                edited[field] = value or current
            return Decision(verdict="edit", args=edited)


def execute_tool(name, raw_arguments) -> str:
    fn, args_model = TOOLS[name]

    try:
        args = args_model.model_validate_json(raw_arguments)
    except ValidationError as e:
        return f"Invalid arguments: {e}"

    if name in REQUIRES_APPROVAL:
        decision = ask_human(name, args.model_dump())

        if decision.verdict == "reject":
            return f"REJECTED by human reviewer. Feedback: {decision.feedback or 'none'}"

        if decision.verdict == "edit":
            try:
                args = args_model.model_validate(decision.args)
            except ValidationError as e:
                return f"Reviewer edit was invalid: {e}"

    result = str(fn(**args.model_dump()))

    # Tell the model about the edit, or it will report the arguments it originally asked for.
    if name in REQUIRES_APPROVAL and decision.verdict == "edit":
        return f"{result} (The human reviewer edited the arguments to {args.model_dump()}.)"
    return result


# Agent loop

def run_agent(task, max_steps=8):
    messages = [{"role": "user", "content": task}]

    for _ in range(max_steps):
        response = client.responses.create(
            model=MODEL, instructions=SYSTEM_PROMPT, input=messages, tools=tool_schemas
        )
        messages += response.output

        calls = [item for item in response.output if item.type == "function_call"]
        if not calls:
            return response.output_text

        for call in calls:
            print(f"\n[tool] {call.name}({call.arguments})")
            output = execute_tool(call.name, call.arguments)
            print(f"[result] {output}")
            messages.append({"type": "function_call_output", "call_id": call.call_id, "output": output})

    raise RuntimeError("Agent did not finish within max_steps")


if __name__ == "__main__":
    print(run_agent("Order A100 arrived with a broken spacebar. Please refund me the full amount."))
