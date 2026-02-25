import { readDB, writeDB } from "../../lib/db";

export default function handler(req, res) {
	const db = readDB();

	if (req.method === "GET") {
		return res.status(200).json(db.projects);
	}

	if (req.method === "POST") {
		const project = req.body;
		const idx = db.projects.findIndex((p) => p.id === project.id);
		if (idx >= 0) {
			db.projects[idx] = project;
		} else {
			db.projects.push(project);
		}
		writeDB(db);
		return res.status(200).json(project);
	}

	if (req.method === "DELETE") {
		const { id } = req.query;
		db.projects = db.projects.filter((p) => p.id !== id);
		db.tasks = db.tasks.filter((t) => t.projectId !== id);
		writeDB(db);
		return res.status(200).json({ ok: true });
	}

	res.status(405).end();
}
