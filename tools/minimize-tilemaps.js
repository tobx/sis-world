#!/usr/bin/env node

import { readFile, readdir, writeFile } from "fs/promises";

import Path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = Path.dirname(__filename);

const projectDir = Path.dirname(__dirname);

const tilemapDir = Path.join(projectDir, "public", "assets", "tilemaps");

async function convertFile(file) {
  const tilemap = JSON.parse(await readFile(file));
  writeFile(file, JSON.stringify(tilemap));
}

async function main() {
  const files = await readdir(tilemapDir);
  Promise.all(
    files
      .filter(file => Path.extname(file) === ".tmj")
      .map(async file => convertFile(Path.join(tilemapDir, file)))
  );
}

main();
