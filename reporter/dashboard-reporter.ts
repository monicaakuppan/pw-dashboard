// reporter/dashboard-reporter.ts
import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface TestRecord {
  id: string;
  title: string;
  fullTitle: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  retries: number;
  errors: string[];
  screenshots: string[];
  videos: string[];
  traces: string[];
  logs: string[];
  startTime: string;
  browser?: string;
}

interface DashboardData {
  runId: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
    passRate: number;
  };
  tests: TestRecord[];
  history: RunSummary[];
}

interface RunSummary {
  runId: string;
  date: string;
  total: number;
  passed: number;
  failed: number;
  duration: number;
  status: string;
}

class DashboardReporter implements Reporter {
  private tests: TestRecord[] = [];
  private startTime: Date = new Date();
  private outputDir = 'dashboard/public';
  private historyFile = 'dashboard/public/history.json';

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = new Date();
    fs.mkdirSync(this.outputDir, { recursive: true });
    console.log(`\n🎭 Dashboard Reporter started at ${this.startTime.toISOString()}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const screenshots = result.attachments
      .filter(a => a.name === 'screenshot' && a.path)
      .map(a => path.relative(this.outputDir, a.path!));

    const videos = result.attachments
      .filter(a => a.name === 'video' && a.path)
      .map(a => path.relative(this.outputDir, a.path!));

    const traces = result.attachments
      .filter(a => a.name === 'trace' && a.path)
      .map(a => path.relative(this.outputDir, a.path!));

    const logs = result.stdout.concat(result.stderr).map(e =>
      typeof e === 'string' ? e : e.toString()
    );

    const errors = result.errors.map(e => e.message || String(e));

    // Extract browser from test title path
    const browser = test.parent?.project()?.name;

    this.tests.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      file: test.location.file,
      status: result.status as TestRecord['status'],
      duration: result.duration,
      retries: result.retry,
      errors,
      screenshots,
      videos,
      traces,
      logs,
      startTime: new Date(this.startTime.getTime() + result.startTime.getTime()).toISOString(),
      browser,
    });
  }

  onEnd(result: FullResult) {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const timedOut = this.tests.filter(t => t.status === 'timedOut').length;
    const total = this.tests.length;

    const runId = `run-${this.startTime.toISOString().replace(/[:.]/g, '-')}`;

    // Load history
    let history: RunSummary[] = [];
    if (fs.existsSync(this.historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      } catch {}
    }

    const thisRun: RunSummary = {
      runId,
      date: this.startTime.toISOString(),
      total,
      passed,
      failed,
      duration,
      status: result.status,
    };

    history = [thisRun, ...history].slice(0, 20); // keep last 20 runs

    const dashboardData: DashboardData = {
      runId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      status: result.status,
      summary: {
        total,
        passed,
        failed,
        skipped,
        timedOut,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      },
      tests: this.tests,
      history,
    };

    fs.writeFileSync(
      path.join(this.outputDir, 'dashboard-data.json'),
      JSON.stringify(dashboardData, null, 2)
    );

    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));

    console.log(`\n✅ Dashboard data written to ${this.outputDir}/dashboard-data.json`);
    console.log(`📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped out of ${total}`);
  }
}

export default DashboardReporter;
