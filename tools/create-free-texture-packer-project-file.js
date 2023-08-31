#!/usr/bin/env node

import { readFile, stat, writeFile } from "fs/promises";

import Path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = Path.dirname(__filename);

const projectDir = Path.dirname(__dirname);

const texturesDir = Path.resolve(Path.join(projectDir, "assets", "textures"));
const templatePath = Path.join(texturesDir, "atlas-with-relative-paths.json");
const outputPath = Path.join(texturesDir, "atlas.ftpp");
const savePath = Path.resolve(
  Path.join(projectDir, "public", "assets", "atlases")
);

async function main() {
  try {
    await stat(outputPath);
    return;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  const atlas = JSON.parse(await readFile(templatePath));
  atlas.savePath = savePath;
  atlas.packOptions.savePath = savePath;
  atlas.folders = atlas.folders.map(folder => Path.join(texturesDir, folder));
  await writeFile(outputPath, JSON.stringify(atlas, undefined, 2));
}

main();
