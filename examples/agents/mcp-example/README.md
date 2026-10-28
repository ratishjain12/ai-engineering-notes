# MCP Weather Server

A small MCP server that exposes two US National Weather Service tools, `get_alerts` and `get_forecast`, over stdio. No API key needed.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Build it in this order

1. Create the server with `MCPServer("weather-mcp", ...)`.
2. Write `make_nws_request`, a helper that calls the NWS API with a `User-Agent` header and returns `None` on any failure.
3. Write `format_alert` to turn one alert feature into readable text.
4. Register `get_alerts(state)` with `@mcp.tool()`. The docstring becomes the tool description the model sees, so describe the arguments there.
5. Register `get_forecast(latitude, longitude)`. It makes two calls: `/points/{lat},{lon}` returns the forecast URL, then you fetch that URL for the periods.
6. Return plain strings, including for failures, so the model can read the result.
7. Start the server with `mcp.run(transport="stdio")`.

## Inspect the server

Run the MCP Inspector against the server:

```bash
mcp dev server.py
```

It opens a browser UI where you can:

1. Click **Connect** to start the server over stdio.
2. Open the **Tools** tab and click **List Tools** to see both tools and their generated input schemas.
3. Select `get_alerts`, enter `CA`, and click **Run Tool**.
4. Select `get_forecast`, enter `37.7749` and `-122.4194`, and run it.

The Inspector shows the raw JSON-RPC messages, which is the fastest way to see what a client actually sends and receives.

## Assignment

- Add a `get_alerts_by_severity(state, severity)` tool that filters alerts to `Severe` or `Extreme`. Check how the Inspector renders the new schema.
- Add a resource, for example `weather://states` returning the list of valid state codes, and read it from the Inspector's **Resources** tab.
- Add a prompt that takes a city and asks the model to summarise the forecast for a traveller. Run it from the **Prompts** tab.
- Validate `state` (two letters, uppercase) and return a clear error message instead of calling the API with bad input.
- `make_nws_request` hides every failure behind `None`. Log the real error to stderr (not stdout, which carries the protocol) and return a more specific message to the model.
- Connect the server to Claude Code with `claude mcp add weather -- python /absolute/path/to/server.py` and ask it for the forecast in your city.
