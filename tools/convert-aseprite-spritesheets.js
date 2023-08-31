#!/usr/bin/env node

import { readFile, readdir, stat, writeFile } from "fs/promises";

import Path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = Path.dirname(__filename);

const projectDir = Path.dirname(__dirname);

const config = {
  sourceDir: Path.join(projectDir, "assets/sprites"),
  outputFile: Path.join(projectDir, "src", "sprite", "config.json"),
};

async function convertDirectory(directory) {
  if (!(await stat(directory)).isDirectory()) {
    return null;
  }
  const files = await readdir(directory);
  const result = await Promise.all(
    files
      .filter(file => Path.extname(file) === ".json")
      .map(async file => [
        Path.parse(file).name,
        await convertFile(directory, file),
      ])
  );
  return Object.fromEntries(result);
}

async function convertFile(directory, file) {
  const aseprite = JSON.parse(await readFile(Path.join(directory, file)));
  const tags = aseprite.meta.frameTags;
  if (tags === undefined || tags.length === 0) {
    throw new Error("Error: missing animation tags");
  }
  return {
    durations: aseprite.frames.map(frame => frame.duration),
    frame: getFrameDimensions(aseprite.frames),
    tags: aseprite.meta.frameTags.map(({ name, from, to }) => ({
      name: name.toLowerCase().replaceAll(" ", "-"),
      from,
      to,
    })),
  };
}

function getFrameDimensions(frames) {
  const {
    frame: { w: width, h: height },
  } = frames[0];
  if (frames.some(({ frame }) => frame.w !== width || frame.h !== height)) {
    throw new Error("Error: frame widths or heights are not equal");
  }
  return { width, height };
}

async function main() {
  const directories = await readdir(config.sourceDir);
  const result = await Promise.all(
    directories.map(async directory => [
      directory,
      await convertDirectory(Path.join(config.sourceDir, directory)),
    ])
  );
  const data = Object.fromEntries(
    result.filter(([, result]) => result !== null)
  );
  writeFile(config.outputFile, JSON.stringify(data));
}

main();
