import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const stage = process.argv[2];
const {compare,summary} = await import(pathToFileURL(resolve(stage,'model.mjs')));
const examples = JSON.parse(readFileSync(resolve(stage,'examples.json'),'utf8'));
console.log(JSON.stringify(Object.fromEntries(examples.map(e => [e.slug,summary(compare(e.offers,e.months),e.months)]))));
