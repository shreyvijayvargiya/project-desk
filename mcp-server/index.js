#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, "..", "data", "db.json");
const DATA_DIR = join(__dirname, "..", "data");

function readDB() {
	if (!existsSync(DB_PATH)) {
		if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
		writeFileSync(DB_PATH, JSON.stringify({ projects: [], tasks: [] }, null, 2));
	}
	return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDB(data) {
	writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const server = new McpServer({
	name: "project-desk",
	version: "1.0.0",
});

// ── list_projects ─────────────────────────────────────────────────────────────
server.tool("list_projects", "List all projects in ProjectDesk", {}, async () => {
	const db = readDB();
	if (db.projects.length === 0) {
		return { content: [{ type: "text", text: "No projects yet. Use create_project to add one." }] };
	}
	const lines = db.projects.map((p) => {
		const taskCount = db.tasks.filter((t) => t.projectId === p.id).length;
		return `• [${p.id}] ${p.name}${p.url ? ` — ${p.url}` : ""}  (${taskCount} tasks)${p.description ? `\n  ${p.description}` : ""}`;
	});
	return { content: [{ type: "text", text: `Projects (${db.projects.length}):\n\n${lines.join("\n")}` }] };
});

// ── create_project ────────────────────────────────────────────────────────────
server.tool(
	"create_project",
	"Create a new project in ProjectDesk",
	{
		name: z.string().describe("Project name"),
		url: z.string().optional().describe("Project URL"),
		description: z.string().optional().describe("Short description"),
	},
	async ({ name, url = "", description = "" }) => {
		const db = readDB();
		const project = { id: uid(), name, url, description, createdAt: Date.now() };
		db.projects.push(project);
		writeDB(db);
		return { content: [{ type: "text", text: `Project created: "${name}"\nID: ${project.id}` }] };
	}
);

// ── list_tasks ────────────────────────────────────────────────────────────────
server.tool(
	"list_tasks",
	"List tasks for a project, optionally filtered by status column",
	{
		projectId: z.string().describe("Project ID (from list_projects)"),
		status: z
			.enum(["backlog", "todo", "inprogress", "done"])
			.optional()
			.describe("Filter by column status"),
	},
	async ({ projectId, status }) => {
		const db = readDB();
		const project = db.projects.find((p) => p.id === projectId);
		if (!project) return { content: [{ type: "text", text: `Project not found: ${projectId}` }] };
		let tasks = db.tasks.filter((t) => t.projectId === projectId);
		if (status) tasks = tasks.filter((t) => t.status === status);
		if (tasks.length === 0) {
			return { content: [{ type: "text", text: `No tasks${status ? ` in "${status}"` : ""} for project "${project.name}".` }] };
		}
		const lines = tasks.map((t) => `• [${t.id}] [${t.status}] [${t.priority}] ${t.title}${t.description ? `\n  ${t.description}` : ""}`);
		return { content: [{ type: "text", text: `Tasks for "${project.name}" (${tasks.length}):\n\n${lines.join("\n")}` }] };
	}
);

// ── add_task ──────────────────────────────────────────────────────────────────
server.tool(
	"add_task",
	"Add a task (todo) to a project",
	{
		projectId: z.string().describe("Project ID to add the task to"),
		title: z.string().describe("Task title"),
		description: z.string().optional().describe("Task description"),
		priority: z.enum(["Low", "Medium", "High"]).optional().describe("Priority (default: Medium)"),
		status: z
			.enum(["backlog", "todo", "inprogress", "done"])
			.optional()
			.describe("Column to place task in (default: todo)"),
	},
	async ({ projectId, title, description = "", priority = "Medium", status = "todo" }) => {
		const db = readDB();
		const project = db.projects.find((p) => p.id === projectId);
		if (!project) return { content: [{ type: "text", text: `Project not found: ${projectId}` }] };
		const task = { id: uid(), projectId, title, description, priority, status, createdAt: Date.now() };
		db.tasks.push(task);
		writeDB(db);
		return {
			content: [{
				type: "text",
				text: `Task added to "${project.name}":\n"${title}" [${status}] [${priority}]\nID: ${task.id}`,
			}],
		};
	}
);

// ── move_task ─────────────────────────────────────────────────────────────────
server.tool(
	"move_task",
	"Move a task to a different kanban column",
	{
		taskId: z.string().describe("Task ID (from list_tasks)"),
		status: z.enum(["backlog", "todo", "inprogress", "done"]).describe("Target column"),
	},
	async ({ taskId, status }) => {
		const db = readDB();
		const idx = db.tasks.findIndex((t) => t.id === taskId);
		if (idx === -1) return { content: [{ type: "text", text: `Task not found: ${taskId}` }] };
		const prev = db.tasks[idx].status;
		db.tasks[idx] = { ...db.tasks[idx], status };
		writeDB(db);
		return { content: [{ type: "text", text: `"${db.tasks[idx].title}" moved: ${prev} → ${status}` }] };
	}
);

// ── update_task ───────────────────────────────────────────────────────────────
server.tool(
	"update_task",
	"Edit a task's title, description, or priority",
	{
		taskId: z.string().describe("Task ID"),
		title: z.string().optional().describe("New title"),
		description: z.string().optional().describe("New description"),
		priority: z.enum(["Low", "Medium", "High"]).optional().describe("New priority"),
	},
	async ({ taskId, title, description, priority }) => {
		const db = readDB();
		const idx = db.tasks.findIndex((t) => t.id === taskId);
		if (idx === -1) return { content: [{ type: "text", text: `Task not found: ${taskId}` }] };
		if (title !== undefined) db.tasks[idx].title = title;
		if (description !== undefined) db.tasks[idx].description = description;
		if (priority !== undefined) db.tasks[idx].priority = priority;
		writeDB(db);
		return { content: [{ type: "text", text: `Task updated: "${db.tasks[idx].title}"` }] };
	}
);

// ── delete_task ───────────────────────────────────────────────────────────────
server.tool(
	"delete_task",
	"Delete a task permanently",
	{
		taskId: z.string().describe("Task ID to delete"),
	},
	async ({ taskId }) => {
		const db = readDB();
		const idx = db.tasks.findIndex((t) => t.id === taskId);
		if (idx === -1) return { content: [{ type: "text", text: `Task not found: ${taskId}` }] };
		const title = db.tasks[idx].title;
		db.tasks.splice(idx, 1);
		writeDB(db);
		return { content: [{ type: "text", text: `Deleted task: "${title}"` }] };
	}
);

// ── delete_project ────────────────────────────────────────────────────────────
server.tool(
	"delete_project",
	"Delete a project and all its tasks",
	{
		projectId: z.string().describe("Project ID to delete"),
	},
	async ({ projectId }) => {
		const db = readDB();
		const idx = db.projects.findIndex((p) => p.id === projectId);
		if (idx === -1) return { content: [{ type: "text", text: `Project not found: ${projectId}` }] };
		const name = db.projects[idx].name;
		const taskCount = db.tasks.filter((t) => t.projectId === projectId).length;
		db.projects.splice(idx, 1);
		db.tasks = db.tasks.filter((t) => t.projectId !== projectId);
		writeDB(db);
		return { content: [{ type: "text", text: `Deleted project "${name}" and ${taskCount} task(s).` }] };
	}
);

const transport = new StdioServerTransport();
await server.connect(transport);
