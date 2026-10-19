// Builds the two test sites and serves them for Playwright:
//   http://localhost:4310  fully configured (test-only number, example.com)
//   http://localhost:4311  the real content as shipped (preview state)

import { createServer } from '../../scripts/serve.mjs';
import { makeConfiguredSite, makePreviewSite } from '../fixtures/make-site.mjs';

const configured = await makeConfiguredSite('e2e-configured');
const preview = await makePreviewSite('e2e-preview');
createServer(configured.outDir).listen(4310);
createServer(preview.outDir).listen(4311);
console.log('Test sites ready on :4310 (configured) and :4311 (preview)');
