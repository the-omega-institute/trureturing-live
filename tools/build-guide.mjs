import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const licenses = await Promise.all(['zod','eventsource-parser','idb-keyval'].map(async name =>
  name + '\n' + await readFile(new URL('../node_modules/' + name + (name === 'idb-keyval' ? '/LICENCE' : '/LICENSE'), import.meta.url), 'utf8')));
await build({entryPoints:['client/guide-model.mjs'], outfile:'site/assets/guide-model.mjs', bundle:true,
  minify:true, format:'esm', target:'es2022', banner:{js:'/*!\n' + licenses.join('\n') + '\n*/'}});
