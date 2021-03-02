// deno-fmt-ignore-file

import { desc, env, log, run, sh, task } from 'https://deno.land/x/drake@v1.4.6/mod.ts';
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
	await sh(`drake --list-tasks`);
});

// console.log({ isMain: isMain() });

// export { x };
// if (Deno.mainModule === import.meta.url) {
// if (isMain()) {
run();
// }

// throw 'test';
// Deno.exit(100);
