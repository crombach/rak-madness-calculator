#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchDemo } from "./lib/browser.js";

function parseArgs(argv) {
  const args = {
    baseUrl: "http://localhost:3000",
    viewportWidth: 430,
    viewportHeight: 900,
    screenshot: false,
    touch: false,
    mp4: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--scenario":
        args.scenario = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--base-url":
        args.baseUrl = next();
        break;
      case "--viewport":
        [args.viewportWidth, args.viewportHeight] = next()
          .split("x")
          .map(Number);
        break;
      case "--screenshot":
        args.screenshot = true;
        break;
      case "--touch":
        args.touch = true;
        break;
      case "--mp4":
        args.mp4 = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.scenario || !args.out) {
    throw new Error(
      "Usage: record.js --scenario <path> --out <file> [--screenshot] [--base-url <url>] [--viewport WxH] [--touch] [--mp4]",
    );
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenarioPath = path.resolve(process.cwd(), args.scenario);
  const scenario = (await import(pathToFileURL(scenarioPath).href)).default;

  const { context, page, finish } = await launchDemo({
    outPath: path.resolve(process.cwd(), args.out),
    screenshot: args.screenshot,
    viewport: { width: args.viewportWidth, height: args.viewportHeight },
    touch: args.touch,
    mp4: args.mp4,
  });

  await scenario({ page, context, baseUrl: args.baseUrl });

  const written = await finish();
  console.log(written);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
