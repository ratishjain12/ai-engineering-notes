"""A minimal agent loop using a mock model."""

def mock_model(messages):
    if len(messages) == 1:
            return {
                "type": "tool_call",
                "name": "calculator",
                "arguments": {"a": 10, "b": 20},
            }

    return {
        "type": "final",
        "content": "The result is 30.",
    }


def calculator(a, b):
    """A simple calculator tool that adds two numbers."""
    return a + b


def run_agent(task, max_steps=5):
     messages = [{"role": "user","content": task}]

     for _ in range(max_steps):
          response = mock_model(messages)
          messages.append(response)

          if response["type"] == "tool_call":
               tool_name = response["name"]
               tool_args = response["arguments"]

               if tool_name == "calculator":
                    result = calculator(**tool_args)
                    messages.append(
                         {
                              "role": "tool",
                              "name": tool_name,
                              "content": f"The result is {result}.",
                         }
                    )
          elif response["type"] == "final":
               return response["content"]
     raise RuntimeError("Maximum number of steps reached")

if __name__ == "__main__":
     task = "Calculate the sum of 10 and 20."
     result = run_agent(task)
     print(result)