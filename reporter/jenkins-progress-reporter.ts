/// <reference types="node" />
// reporter/jenkins-progress-reporter.ts
import {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface JenkinsProgressReporterOptions {
  jenkinsUrl?: string;
  jobName?: string;
  buildNumber?: string;
  user?: string;
  apiToken?: string;
}

class JenkinsProgressReporter implements Reporter {
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private timedOut = 0;
  private total = 0;
  private startTime: Date = new Date();

  private readonly jenkinsUrl: string;
  private readonly jobName: string;
  private readonly buildNumber: string;
  private readonly user: string;
  private readonly apiToken: string;

  private crumb: string | null = null;
  private crumbField = 'Jenkins-Crumb';
  private crumbFetched = false;

  constructor(options: JenkinsProgressReporterOptions = {}) {
    this.jenkinsUrl = (options.jenkinsUrl ?? process.env.JENKINS_URL ?? '').replace(/\/$/, '');
    this.jobName    = options.jobName    ?? process.env.JOB_NAME      ?? '';
    this.buildNumber = options.buildNumber ?? process.env.BUILD_NUMBER ?? '';
    this.user       = options.user       ?? process.env.JENKINS_USER       ?? '';
    this.apiToken   = options.apiToken   ?? process.env.JENKINS_API_TOKEN  ?? '';
  }

  onBegin(_config: FullConfig, suite: Suite) {
    this.startTime = new Date();
    this.total = suite.allTests().length;
    if (this.isConfigured()) {
      console.log(
        `\n[Jenkins Reporter] Tracking ${this.total} tests for ` +
        `${this.jobName} #${this.buildNumber}`
      );
    } else if (this.jenkinsUrl && this.jobName && this.buildNumber) {
      console.log(
        `\n[Jenkins Reporter] JENKINS_USER / JENKINS_API_TOKEN not set — ` +
        `live build description updates disabled`
      );
    }
  }

  onTestEnd(_test: TestCase, result: TestResult) {
    switch (result.status) {
      case 'passed':   this.passed++;   break;
      case 'failed':   this.failed++;   break;
      case 'skipped':  this.skipped++;  break;
      case 'timedOut': this.timedOut++; break;
    }
    if (this.isConfigured()) {
      this.updateDescription().catch(err =>
        console.error('[Jenkins Reporter] Failed to update build description:', err.message)
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnd(_result: FullResult) { /* final state already pushed in last onTestEnd */ }

  // ── private ──────────────────────────────────────────────────────────────

  private isConfigured(): boolean {
    return !!(this.jenkinsUrl && this.jobName && this.buildNumber && this.user && this.apiToken);
  }

  private buildDescription(): string {
    const done = this.passed + this.failed + this.skipped + this.timedOut;
    const passRate = done > 0 ? Math.round((this.passed / done) * 100) : 0;
    const elapsedSec = Math.round((Date.now() - this.startTime.getTime()) / 1000);
    const bar = this.progressBar(done, this.total);
    return (
      `${bar} ${done}/${this.total} | ` +
      `✅ ${this.passed} passed  ❌ ${this.failed} failed  ⏭ ${this.skipped} skipped | ` +
      `Pass rate: ${passRate}% | Elapsed: ${elapsedSec}s`
    );
  }

  private progressBar(done: number, total: number, width = 10): string {
    if (total === 0) return '[----------]';
    const filled = Math.round((done / total) * width);
    return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
  }

  private async fetchCrumb(): Promise<void> {
    if (this.crumbFetched || !this.user || !this.apiToken) return;
    this.crumbFetched = true;
    try {
      const data = await this.httpGet(`${this.jenkinsUrl}/crumbIssuer/api/json`);
      const json = JSON.parse(data) as { crumb: string; crumbRequestField: string };
      this.crumb = json.crumb;
      this.crumbField = json.crumbRequestField ?? 'Jenkins-Crumb';
    } catch {
      // CSRF protection may be disabled on this Jenkins instance — continue without crumb
    }
  }

  private async updateDescription(): Promise<void> {
    await this.fetchCrumb();

    // Encode multi-level job paths: "folder/job" → "job/folder/job/job"
    const encodedJob = this.jobName
      .split('/')
      .map(encodeURIComponent)
      .join('/job/');

    const endpoint = `${this.jenkinsUrl}/job/${encodedJob}/${this.buildNumber}/submitDescription`;
    const body = `description=${encodeURIComponent(this.buildDescription())}`;
    await this.httpPost(endpoint, body);
  }

  private authHeader(): string {
    return `Basic ${Buffer.from(`${this.user}:${this.apiToken}`).toString('base64')}`;
  }

  private httpGet(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || undefined,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          headers: { Authorization: this.authHeader() },
        },
        (res: import('http').IncomingMessage) => {
          let data = '';
          res.on('data', (chunk: Buffer | string) => { data += chunk; });
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  private httpPost(targetUrl: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const mod = parsed.protocol === 'https:' ? https : http;

      const headers: Record<string, string> = {
        Authorization: this.authHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(Buffer.byteLength(body)),
      };
      if (this.crumb) {
        headers[this.crumbField] = this.crumb;
      }

      const req = mod.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || undefined,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers,
        },
        (res: import('http').IncomingMessage) => {
          res.resume(); // drain response body
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Jenkins API responded with HTTP ${res.statusCode}`));
          } else {
            resolve();
          }
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

export default JenkinsProgressReporter;
