// Checks the content files without building:  npm run check
// Lists problems to fix, gentle warnings, and what is left before launch.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBlockers, loadContent } from './lib/content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = loadContent(root);
const { errors, warnings } = content.report;

console.log('\n  GK Atelier — content check\n');
if (errors.length) {
  console.log('  Problems to fix (the website cannot be built until these are fixed):');
  for (const e of errors) console.log(`   ✖ ${e.file}: ${e.message}`);
  console.log('');
}
if (warnings.length) {
  console.log('  Worth a look:');
  for (const w of warnings) console.log(`   ⚠ ${w.file}: ${w.message}`);
  console.log('');
}
const blockers = launchBlockers(content);
if (blockers.length) {
  console.log('  Before launch:');
  for (const b of blockers) console.log(`   • ${b.message}`);
} else {
  console.log('  ✓ Ready to launch.');
}
console.log(`\n  ${content.products.length} products shown · ${content.collections.length} collections\n`);
process.exit(errors.length ? 1 : 0);
