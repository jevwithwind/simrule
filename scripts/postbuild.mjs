// Keeps GitHub Pages from running Jekyll over the static build.
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../docs/.nojekyll', import.meta.url), '');
console.log('docs/.nojekyll written');
