import { readDB, writeDB } from "../../lib/db";

export default function handler(req, res) {
	const db = readDB();

	if (req.method === "GET") {
		return res.status(200).json(db.tasks);
	}

	if (req.method === "POST") {
		const task = req.body;
		const idx = db.tasks.findIndex((t) => t.id === task.id);
		if (idx >= 0) {
			db.tasks[idx] = task;
		} else {
			db.tasks.push(task);
		}
		writeDB(db);
		return res.status(200).json(task);
	}

	if (req.method === "DELETE") {
		const { id } = req.query;
		db.tasks = db.tasks.filter((t) => t.id !== id);
		writeDB(db);
		return res.status(200).json({ ok: true });
	}

	res.status(405).end();
}
