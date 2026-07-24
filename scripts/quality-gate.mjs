#!/usr/bin/env node
// Catraca de qualidade: compara métricas atuais com baseline.json e falha em
// qualquer regressão. `--baseline` regrava o baseline (uso: pós-merge na main).
// Métricas: lint (erros/warnings), duplicação (jscpd), cobertura (vitest --coverage),
// arquivos TypeScript > 500 linhas.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, 'baseline.json');
const SUMMARY_PATH = path.join(ROOT, 'summary.md');
const MAX_FILE_LINES = 500;
const isBaselineMode = process.argv.includes('--baseline');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 50,
      shell: process.platform === 'win32',
    });
  } catch (err) {
    // ESLint/jscpd saem com código != 0 quando encontram problemas, mas ainda
    // imprimem o relatório (stdout ou arquivo) — o chamador decide como recuperar.
    return err.stdout ?? null;
  }
}

function runJson(cmd, args) {
  const out = run(cmd, args);
  if (out === null) {
    console.warn(`[quality-gate] aviso: falha ao rodar "${cmd} ${args.join(' ')}"`);
    return null;
  }
  try {
    return JSON.parse(out);
  } catch (err) {
    console.warn(
      `[quality-gate] aviso: saída não-JSON de "${cmd} ${args.join(' ')}": ${err.message}`,
    );
    return null;
  }
}

function collectLint() {
  const results = runJson(NPX, ['eslint', '.', '--format', 'json']) ?? [];
  let errors = 0;
  let warnings = 0;
  for (const file of results) {
    errors += file.errorCount ?? 0;
    warnings += file.warningCount ?? 0;
  }
  return { errors, warnings };
}

function collectDuplication() {
  // jscpd escreve o relatório no arquivo (--output); stdout é log colorido, não JSON.
  run(NPX, [
    'jscpd',
    'src',
    '--reporters',
    'json',
    '--output',
    '.jscpd-report',
    '--silent',
    '--ignore',
    '**/generated/**,**/*.test.ts',
  ]);
  const reportPath = path.join(ROOT, '.jscpd-report', 'jscpd-report.json');
  if (!fs.existsSync(reportPath)) return { percentage: 0 };
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  return { percentage: report.statistics?.total?.percentage ?? 0 };
}

function collectCoverage() {
  const summaryPath = path.join(ROOT, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(summaryPath)) return { lines: 0 };
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  return { lines: summary.total?.lines?.pct ?? 0 };
}

function collectOversizedFiles() {
  const tracked = execFileSync('git', ['ls-files', 'src'], { encoding: 'utf-8' })
    .split('\n')
    .filter((f) => f.endsWith('.ts') && !f.includes('/generated/') && !f.endsWith('.test.ts'));

  const oversized = [];
  for (const file of tracked) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    const lineCount = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
    if (lineCount > MAX_FILE_LINES) oversized.push({ file, lines: lineCount });
  }
  return oversized;
}

function collectMetrics() {
  return {
    lint: collectLint(),
    duplication: collectDuplication(),
    coverage: collectCoverage(),
    oversizedFiles: collectOversizedFiles(),
  };
}

function writeSummary(current, baseline, regressions) {
  const rows = [
    `| Métrica | Baseline | Atual | Status |`,
    `|---|---|---|---|`,
    `| Lint — erros | ${baseline.lint.errors} | ${current.lint.errors} | ${current.lint.errors > baseline.lint.errors ? '❌' : '✅'} |`,
    `| Lint — warnings | ${baseline.lint.warnings} | ${current.lint.warnings} | ${current.lint.warnings > baseline.lint.warnings ? '⚠️' : '✅'} |`,
    `| Duplicação (%) | ${baseline.duplication.percentage.toFixed(2)} | ${current.duplication.percentage.toFixed(2)} | ${current.duplication.percentage > baseline.duplication.percentage ? '❌' : '✅'} |`,
    `| Cobertura — linhas (%) | ${baseline.coverage.lines.toFixed(2)} | ${current.coverage.lines.toFixed(2)} | ${current.coverage.lines < baseline.coverage.lines ? '❌' : '✅'} |`,
    `| Arquivos > ${MAX_FILE_LINES} linhas | ${baseline.oversizedFiles.length} | ${current.oversizedFiles.length} | ${current.oversizedFiles.length > baseline.oversizedFiles.length ? '❌' : '✅'} |`,
  ];

  let body = `## Quality Gate\n\n${rows.join('\n')}\n`;
  if (current.oversizedFiles.length > 0) {
    body += `\n**Arquivos acima do limite:**\n${current.oversizedFiles.map((f) => `- \`${f.file}\` (${f.lines} linhas)`).join('\n')}\n`;
  }
  if (regressions.length > 0) {
    body += `\n**Regressões:**\n${regressions.map((r) => `- ${r}`).join('\n')}\n`;
  } else {
    body += `\n✅ Nenhuma regressão em relação ao baseline.\n`;
  }
  fs.writeFileSync(SUMMARY_PATH, body);
  return body;
}

function main() {
  const current = collectMetrics();

  if (isBaselineMode) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
    console.log(`[quality-gate] baseline.json atualizado.`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.warn(
      '[quality-gate] baseline.json não encontrado — gerando um novo a partir do estado atual (1ª execução).',
    );
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
  const regressions = [];

  if (current.lint.errors > baseline.lint.errors) {
    regressions.push(
      `Erros de lint subiram de ${baseline.lint.errors} para ${current.lint.errors}.`,
    );
  }
  if (current.duplication.percentage > baseline.duplication.percentage) {
    regressions.push(
      `Duplicação subiu de ${baseline.duplication.percentage.toFixed(2)}% para ${current.duplication.percentage.toFixed(2)}%.`,
    );
  }
  if (current.coverage.lines < baseline.coverage.lines) {
    regressions.push(
      `Cobertura de linhas caiu de ${baseline.coverage.lines.toFixed(2)}% para ${current.coverage.lines.toFixed(2)}%.`,
    );
  }
  if (current.oversizedFiles.length > baseline.oversizedFiles.length) {
    regressions.push(
      `Número de arquivos acima de ${MAX_FILE_LINES} linhas subiu de ${baseline.oversizedFiles.length} para ${current.oversizedFiles.length}.`,
    );
  }

  const summary = writeSummary(current, baseline, regressions);
  console.log(summary);

  if (regressions.length > 0) {
    console.error('[quality-gate] REPROVADO — qualidade regrediu em relação ao baseline.');
    process.exit(1);
  }
  console.log('[quality-gate] aprovado.');
}

main();
