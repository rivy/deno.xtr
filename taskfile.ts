// deno-fmt-ignore-file

import { desc, env, glob, log, quote, run, runIfMain, sh, task } from './mod.ts';

// import { desc, env, log, run, sh, task } from 'https://deno.land/x/drake@v1.4.6/mod.ts';
// import { isMain } from './isMain.ts';

// log(
// 	Deno.inspect({ main: Deno.mainModule, exec: Deno.execPath(), args: Deno.args, meta: import.meta })
// );

// console.warn({ exec: Deno.execPath(), main: Deno.mainModule, args: Deno.args });

const quiet = env('--quiet') ? '--quiet' : '';

env('--default-task', 'test');

const TS_FILES = [
	...glob('*.ts'),
	...glob('src/**/*.ts'),
	...glob('+(examples|tests)/*.ts'),
].filter((p) => !p.endsWith('.d.ts'));

desc('Minimal task');
task('hello', [], function () {
	console.log('Hello World!');
});

desc('Display tasks');
task('help', [], async function () {
	// console.log('[help] Hello!');
	// await sh('deno run -A ' + import.meta.url + ' --list-tasks');
});

desc('Run tests');
task('test', ['lint', 'fmt'], async function () {
	await sh(`deno test -A ${quiet} tests`, env('--debug') ? { env: { DRAKE_DEBUG: 'true' } } : {});
});

desc('Format source files');
task('fmt', [], async function () {
	await sh(`dprint --verbose fmt ${quiet} ${quote(TS_FILES)}`);
});

desc('Lint source files');
task('lint', [], async function () {
	await sh(`deno lint ${quiet} --unstable ${quote(TS_FILES)}`);
});

// task('hello', [], function () {
// 	console.log('Hello#2 World!');
// });

// console.log({ isMain: isMain() });

// export { x };
// if (Deno.mainModule === import.meta.url) {
// if (isMain()) {
// run();
// }
export * from './mod.ts';
runIfMain();

// throw 'test';
// Deno.exit(100);
