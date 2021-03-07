// deno-fmt-ignore-file

import { desc, env, log, run, runIfMain, sh, task } from './mod.ts';

// import { desc, env, log, run, sh, task } from 'https://deno.land/x/drake@v1.4.6/mod.ts';
// import { isMain } from './isMain.ts';

// log(
// 	Deno.inspect({ main: Deno.mainModule, exec: Deno.execPath(), args: Deno.args, meta: import.meta })
// );

env('--default-task', 'hello');

desc('Minimal Drake task');
task('hello', [], function () {
	console.log('Hello World!');
});

desc('Display help');
task('help', [], async function () {
	// console.log('[help] Hello!');
	await sh('deno run -A ' + import.meta.url + ' --list-tasks');
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

runIfMain();

// throw 'test';
// Deno.exit(100);
