# ProjectDesk

A local-first project management kanban board that runs in the browser — no auth, no cloud database. Data lives in `data/db.json` on your machine and is shared with an MCP server so Claude can manage your tasks directly.

Built by [Shrey Vijayvargiya](https://x.com/@trevyijay) using [Buildsaas.dev](https://buildsaas.dev)

---

## Running the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## MCP Server — Use ProjectDesk with Claude

The MCP server lets Claude read and write your projects and tasks. Both the app and Claude share the same `data/db.json` file. The browser auto-refreshes every 8 seconds, so tasks added by Claude appear without a manual reload.

### 1. Install MCP server dependencies

```bash
cd mcp-server
npm install
```

### 2. Register with Claude Desktop

Open (or create) the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the following (update the path to match where you cloned this repo):

```json
{
	"mcpServers": {
		"project-desk": {
			"command": "node",
			"args": ["/absolute/path/to/project-desk/mcp-server/index.js"]
		}
	}
}
```

### 3. Restart Claude Desktop

Fully quit and reopen Claude Desktop. You should see a hammer icon (🔨) in the chat input, indicating MCP tools are active.

### 4. Start talking to Claude

Make sure the Next.js dev server is running (`npm run dev`), then ask Claude things like:

> "List my projects"
> "Create a project called Redesign with description 'Q3 website refresh'"
> "Add a High priority task called 'Fix login bug' to my Redesign project"
> "Move the login bug task to in progress"
> "Show me all todo tasks for the Redesign project"

---

## Available MCP tools

| Tool             | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `list_projects`  | List all projects with task counts                       |
| `create_project` | Create a project (name, url, description)                |
| `list_tasks`     | List tasks for a project, optionally filter by column    |
| `add_task`       | Add a task with title, description, priority, and column |
| `move_task`      | Move a task between backlog / todo / inprogress / done   |
| `update_task`    | Edit a task's title, description, or priority            |
| `delete_task`    | Delete a task                                            |
| `delete_project` | Delete a project and all its tasks                       |

---

## Project structure

```
project-desk/
  pages/
    index.js          — main kanban UI
    api/
      projects.js     — REST API for projects
      tasks.js        — REST API for tasks
  mcp-server/
    index.js          — MCP server (reads/writes data/db.json)
    package.json
  data/
    db.json           — local JSON store (gitignored)
  lib/
    db.js             — shared readDB/writeDB helpers
```
