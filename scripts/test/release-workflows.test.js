import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { parse } from 'yaml';

// Release-workflow checks (plan §6). The PR pipeline must stay explicit about
// its switches, and tests must never hide inside non-test npm scripts — the
// post-merge packaging runs those scripts and must not run tests.

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOWS = path.join(REPO_ROOT, '.github', 'workflows');

const loadWorkflow = (name) => parse(readFileSync(path.join(WORKFLOWS, name), 'utf-8'));

test('ci.yml is removed — superseded by test.yml', () => {
  assert.ok(!existsSync(path.join(WORKFLOWS, 'ci.yml')), 'ci.yml still exists');
});

test('test.yml calls the pipeline with lint/site/test all explicit', () => {
  const wf = loadWorkflow('test.yml');
  const verify = wf.jobs?.verify;
  assert.equal(verify?.uses, './.github/workflows/test-pipeline.yml');
  for (const key of ['lint', 'site', 'test']) {
    assert.ok(
      Object.hasOwn(verify.with ?? {}, key),
      `verify.with.${key} must be passed explicitly, not defaulted`
    );
  }
});

test('pipeline builds both arches on their runner labels', () => {
  const pipe = loadWorkflow('test-pipeline.yml');
  const include = pipe.jobs?.build?.strategy?.matrix?.include ?? [];
  const runsOn = Object.fromEntries(include.map((leg) => [leg.arch, leg['runs-on']]));
  assert.equal(runsOn.arm64, 'ubuntu-24.04-arm');
  assert.equal(runsOn.x64, 'ubuntu-24.04');
});

test('pipeline pins Node 24.15.0 on every setup-node step', () => {
  const pipe = loadWorkflow('test-pipeline.yml');
  const versions = [];
  for (const job of Object.values(pipe.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step.uses === 'string' && step.uses.startsWith('actions/setup-node@')) {
        versions.push(step.with?.['node-version']);
      }
    }
  }
  assert.ok(versions.length > 0, 'no setup-node steps found');
  for (const v of versions) {
    assert.equal(String(v), '24.15.0');
  }
});

test('pkg-e2e runs both arches against a postgres:16 service', () => {
  const pipe = loadWorkflow('test-pipeline.yml');
  const e2e = pipe.jobs?.['pkg-e2e'];
  assert.ok(e2e, 'pkg-e2e job missing');
  assert.equal(e2e.services?.postgres?.image, 'postgres:16');
  const arches = (e2e.strategy?.matrix?.include ?? []).map((leg) => leg.arch).sort();
  assert.deepEqual(arches, ['arm64', 'x64']);
  const runs = (e2e.steps ?? []).map((s) => s.run ?? '').join('\n');
  assert.match(runs, /package\.e2e\.js/, 'pkg-e2e never runs the package e2e test');
});

test('no package.json script smuggles tests into non-test scripts', () => {
  const pkgFiles = [path.join(REPO_ROOT, 'package.json')];
  for (const dir of ['apps', 'packages']) {
    for (const entry of readdirSync(path.join(REPO_ROOT, dir))) {
      const p = path.join(REPO_ROOT, dir, entry, 'package.json');
      if (existsSync(p)) pkgFiles.push(p);
    }
  }
  const TEST_RUNNER = /\bnode\s+--test\b|\bnpm\s+test\b|\bnpm\s+run\s+test\b/;
  for (const file of pkgFiles) {
    const { scripts = {} } = JSON.parse(readFileSync(file, 'utf-8'));
    for (const [name, value] of Object.entries(scripts)) {
      if (name === 'test' || name.startsWith('test:')) continue;
      assert.ok(
        !TEST_RUNNER.test(value),
        `${path.relative(REPO_ROOT, file)} script "${name}" runs tests: ${value}`
      );
    }
  }
});
