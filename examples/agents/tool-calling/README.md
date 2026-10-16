Build it in this order:

1. Create the OpenAI client and set up logging.
2. Write the calculator function.
3. Write the get_weather function with mock weather data.
4. Define a Pydantic model for each tool's parameters.
5. Register both functions in the TOOLS dictionary.
6. Convert each model into a tool schema with `pydantic_function_tool`.
7. Write a system prompt that tells the model when to use the tools and how to format the answer.
8. Send the user's request, the system prompt and both tool schemas with `client.responses.create`.
9. Collect the `function_call` items from the model's output. The model may return several in one response.
10. Execute each requested tool, log its name, arguments, result and duration, and append a `function_call_output` with its `call_id`.
11. Call the model again with the results; repeat until it returns no tool calls or `max_steps` is reached.
12. Print the final answer.

## Assignment

- The tools run one after another in a loop. Run them concurrently instead and confirm the total time is the slowest tool, not the sum. Add a `time.sleep` to each tool to see the difference.
- Return an error to the model when it requests an unknown tool, instead of crashing.
- Catch exceptions from tools (bad arguments, a tool that raises) and send the error back as the `function_call_output` so the model can recover. Log the failure.
