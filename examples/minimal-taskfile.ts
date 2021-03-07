import { desc, run, task } from '../mod.ts';

desc('Minimal task');
task('hello', [], function () {
	console.log('Hello World!');
});

run();
