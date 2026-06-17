#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { analyzeRoom, renderCli, validateCli } from '../src/domains/rendering/application/index.ts';
import { renderCliReal } from '../src/domains/rendering/infrastructure/ai/cliRealRenderGateway.ts';

const VERSION = '0.1.0';
const EXIT_SUCCESS = 0;
const EXIT_INPUT_ERROR = 1;
const EXIT_VALIDATION_ERROR = 2;
const EXIT_SYSTEM_ERROR = 3;

function printHelp() {
  return `pisodev ${VERSION}

Usage:
  pisodev analyze <image-path> [--output=json|table] [--mock-failure]
  pisodev render <image-path> <material-id> [--output=json] [--async] [--dry-run] [--real] [--allow-fallback]
  pisodev validate <image-path> [--output=json]
  pisodev --help
  pisodev --version

Commands:
  analyze    Analyze a room image and return a semantic scene description
  render     Produce a render contract using the canonical domains/rendering pipeline
  validate   Evaluate a render against the VTA semantic contract

Options:
  --help     Show this message
  --version  Print CLI version
  --output   Output format (json or table)
  --async    Queue render output instead of returning the final image
  --dry-run  Print the canonical application target without rendering
  --real     Request the real render path when enabled
  --allow-fallback  Allow deterministic fallback if the real path fails`;
}

function fail(message, code, io) {
  io.stderr(`${message}\n`);
  io.exit(code);
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.split('=');
    const key = rawKey.slice(2);

    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      index += 1;
      continue;
    }

    flags[key] = true;
  }

  return { positionals, flags };
}

function renderOutput(data, outputMode = 'table', io) {
  if (outputMode === 'json') {
    io.stdout(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (typeof data === 'string') {
    io.stdout(`${data}\n`);
    return;
  }

  io.stdout(`${JSON.stringify(data, null, 2)}\n`);
}

function buildSafeAnalysis(imagePath) {
  return {
    roomType: 'Ambiente Genérico',
    lightingType: 'Iluminacao Padrao',
    protectedElements: ['Paredes', 'Teto'],
    floorObstacles: [],
    geometryNotes: `Analise local segura para ${path.basename(imagePath)}`,
    hasPeople: false,
    floorCoverage: 50,
    visualAnchor: 'Centro da cena',
    scaleAnchor: {
      object: 'none',
      pixelWidth: null,
      estimatedCmPerPixel: null
    },
    occlusionDensity: 0.5
  };
}

export async function runCli(argv, io = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  exit: (code) => process.exit(code)
}, deps = {
  analyzeRoom,
  renderCli: (input) => renderCli(input, {
    isRealRenderEnabled: () => process.env.PISODEV_ENABLE_REAL_RENDER === 'true',
    realRender: renderCliReal
  }),
  validateCli
}) {

  if (argv.length === 0 || argv.includes('--help')) {
    io.stdout(`${printHelp()}\n`);
    io.exit(EXIT_SUCCESS);
    return;
  }

  if (argv.includes('--version')) {
    io.stdout(`${VERSION}\n`);
    io.exit(EXIT_SUCCESS);
    return;
  }

  const command = argv[0];
  const { positionals, flags } = parseArgs(argv.slice(1));
  const outputMode = flags.output ?? 'table';

  if (!['json', 'table'].includes(outputMode)) {
    fail(`Unsupported output format: ${outputMode}`, EXIT_INPUT_ERROR, io);
    return;
  }

  if (flags['mock-failure']) {
    fail('Simulated provider failure for CLI contract testing.', EXIT_SYSTEM_ERROR, io);
    return;
  }

  if (command === 'analyze') {
    const [imagePath] = positionals;
    ensureFileExists(imagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    const result = await deps.analyzeRoom({
      base64Image: imageBuffer.toString('base64')
    });
    renderOutput(result, outputMode, io);
    io.exit(EXIT_SUCCESS);
    return;
  }

  if (command === 'render') {
    const [imagePath, materialId] = positionals;
    ensureFileExists(imagePath);

    if (!materialId) {
      fail('Material id is required for render.', EXIT_INPUT_ERROR, io);
      return;
    }

    if (flags['dry-run']) {
      io.stdout('renderPipeline -> src/domains/rendering/application/renderPipeline.ts\n');
      io.exit(EXIT_SUCCESS);
      return;
    }

    if (flags.async) {
      const queuedResult = await deps.renderCli({
        materialId,
        asyncMode: true,
        base64Image: fs.readFileSync(imagePath).toString('base64'),
        realMode: Boolean(flags.real),
        allowFallback: Boolean(flags['allow-fallback'])
      });
      renderOutput(queuedResult, outputMode, io);
      io.exit(EXIT_SUCCESS);
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const result = await deps.renderCli({
      materialId,
      asyncMode: false,
      base64Image: imageBuffer.toString('base64'),
      realMode: Boolean(flags.real),
      allowFallback: Boolean(flags['allow-fallback'])
    });

    if (outputMode === 'json') {
      renderOutput(result, outputMode, io);
    } else {
      io.stdout(`Render queued from domains/rendering for material ${materialId}\n`);
    }

    io.exit(EXIT_SUCCESS);
    return;
  }

  if (command === 'validate') {
    const [imagePath] = positionals;
    ensureFileExists(imagePath);

    const result = await deps.validateCli({
      fileName: path.basename(imagePath)
    });
    renderOutput(result, outputMode, io);
    io.exit(result.approved ? EXIT_SUCCESS : EXIT_VALIDATION_ERROR);
    return;
  }

  fail(`Unknown command: ${command}`, EXIT_INPUT_ERROR, io);
}

function ensureFileExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw Object.assign(new Error(`Input file not found: ${filePath}`), { exitCode: EXIT_INPUT_ERROR });
  }
}

async function main() {
  try {
    await runCli(process.argv.slice(2));
  } catch (error) {
    const exitCode = typeof error === 'object' && error && 'exitCode' in error ? error.exitCode : EXIT_SYSTEM_ERROR;
    const message = error instanceof Error ? error.message : 'Unexpected CLI failure';
    fail(message, exitCode, {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
      exit: (code) => process.exit(code)
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
