import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.join(packageRoot, "lib", "client.js");
const richMessagePath = path.join(packageRoot, "lib", "rich-message.js");
const client = await readFile(clientPath, "utf8");
const richMessage = (await readFile(richMessagePath, "utf8")).replace(/^export /gmu, "");

if (!client.includes("clientWindow.__ModuleLoader__.load")) throw new Error("client registration entry is missing");

await writeFile(clientPath, `// Generated single-file DSH client entry.\n${richMessage}\n${client}`, "utf8");
