import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "db.json");
const DATA_DIR = join(process.cwd(), "data");

export function readDB() {
	if (!existsSync(DB_PATH)) {
		if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
		writeFileSync(DB_PATH, JSON.stringify({ projects: [], tasks: [] }, null, 2));
	}
	return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

export function writeDB(data) {
	writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}
