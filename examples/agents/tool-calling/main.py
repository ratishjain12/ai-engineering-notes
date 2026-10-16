import json
import logging
import time
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI, pydantic_function_tool
from pydantic import BaseModel, Field

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("tool_calling")
client = OpenAI()


def calculator(a, b, operation):
    if operation == "add":
        return a + b
    if operation == "subtract":
        return a - b
    if operation == "multiply":
        return a * b
    if operation == "divide":
        return a / b if b != 0 else "Error: Division by zero"
    return "Error: Invalid operation"


def get_weather(city):
    return f"The current weather in {city} is sunny with a temperature of 25°C."


class CalculatorParams(BaseModel):
    a: float = Field(description="The first number.")
    b: float = Field(description="The second number.")
    operation: Literal["add", "subtract", "multiply", "divide"] = Field(description="The operation to perform.")


class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city.")


TOOLS = {"calculator": calculator, "get_weather": get_weather}


def to_responses_tool(params, name, description):
    # Responses API expects the function fields flattened, not nested under "function"
    return {"type": "function", **pydantic_function_tool(params, name=name, description=description)["function"]}


tool_schemas = [
    to_responses_tool(CalculatorParams, "calculator", "Performs basic arithmetic operations."),
    to_responses_tool(GetWeatherParams, "get_weather", "Returns a mock weather report for the specified city."),
]


SYSTEM_PROMPT = """You are a helpful assistant with access to a calculator and a weather tool.
Use the tools for any arithmetic or weather question instead of answering from memory.
Format the final answer as a short bulleted list, one bullet per question, like:
- Calculation: 10 + 5 = 15
- Weather in <city>: <report>
Do not add any extra commentary."""


def run_agent(task, max_steps=5):
    messages = [{"role": "user", "content": task}]

    for step in range(1, max_steps + 1):
        response = client.responses.create(
            model="gpt-4o-mini", instructions=SYSTEM_PROMPT, input=messages, tools=tool_schemas
        )
        messages += response.output

        tool_calls = [item for item in response.output if item.type == "function_call"]
        logger.info(
            "step=%d response_id=%s tool_calls=%d tokens=%s",
            step, response.id, len(tool_calls), response.usage.total_tokens,
        )
        if not tool_calls:
            logger.info("final answer ready after %d step(s)", step)
            return response.output_text

        for call in tool_calls:
            logger.info("tool_call id=%s name=%s args=%s", call.call_id, call.name, call.arguments)
            start = time.perf_counter()
            try:
                result = TOOLS[call.name](**json.loads(call.arguments))
            except Exception:
                logger.exception("tool_error id=%s name=%s", call.call_id, call.name)
                raise
            logger.info(
                "tool_result id=%s name=%s duration_ms=%.1f result=%r",
                call.call_id, call.name, (time.perf_counter() - start) * 1000, result,
            )
            messages.append({"type": "function_call_output", "call_id": call.call_id, "output": str(result)})

    logger.error("agent hit max_steps=%d without a final answer", max_steps)
    raise RuntimeError("Agent did not finish within max_steps")


if __name__ == "__main__":
    print(run_agent("Please calculate the sum of 10 and 5 and what is the weather in New York?"))
