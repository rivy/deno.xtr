import { env } from '../src/lib/env.ts';
import { desc, execute, run, task } from '../src/lib/registry.ts';
import { TaskError, readFile, vers, writeFile } from '../src/lib/utils.ts';
import { assert, assertEquals, assertThrowsAsync, existsSync } from './deps.ts';
env('--quiet', true);

Deno.test('registry_test', async function () {
	const tmpDir = Deno.makeTempDirSync();
	const savedCwd = Deno.cwd();
	try {
		env('--directory', tmpDir);

		const dir = env('--directory');
		env('--directory', '.');
		assertEquals(env('--directory'), dir);

		await assertThrowsAsync(
			async () => await run('missing-normal-task'),
			TaskError,
			'missing task:',
			'normal task passed to `run` API must exist'
		);

		await assertThrowsAsync(
			async () => await run('./missing-file-task'),
			TaskError,
			'missing task:',
			'file task passed to `run` API must exist'
		);

		desc('Test task one');
		task('task1', []);

		const prereq = './prerequisite-file';
		const target = './target-file';
		const normalTask = 'normalTask';
		let signature = '';

		assertEquals(task('task1').name, 'task1');
		assertEquals(task('task1').desc, 'Test task one');

		desc('File task');
		task(target, [prereq], function () {
			signature += target;
			writeFile(target, '');
		});

		desc('Normal task');
		task(normalTask, [prereq], () => (signature += normalTask));

		await assertThrowsAsync(
			async () => await run(target),
			TaskError,
			'missing prerequisite file:',
			'prerequisite files should exist when file task executes'
		);

		writeFile(prereq, '');
		await run(target);
		assert(existsSync('./.drake.cache.json'), 'drake cache should have been created');
		const cache = JSON.parse(readFile('./.drake.cache.json'));
		assertEquals(cache.version, vers());
		assertEquals(cache.os, Deno.build.os);

		await assertThrowsAsync(
			async () => await run(normalTask),
			TaskError,
			`${normalTask}: missing prerequisite task: `,
			'missing prerequisite file task should throw error in a normal task'
		);

		task(prereq, []);
		await run(normalTask), // Should now run OK.
			(task(normalTask).prereqs = ['missing-task']);
		await assertThrowsAsync(
			async () => await run(normalTask),
			TaskError,
			`${normalTask}: missing prerequisite task: missing-task`,
			'missing task should throw error'
		);

		task('missing-task', []);
		await run(normalTask); // Should now run OK.

		task(target).prereqs.push(normalTask);
		await run(target); // Normal prerequisites do not throw a "missing prerequisite" error.

		await assertThrowsAsync(
			async () => await execute(normalTask),
			TaskError,
			"'execute' API must be called by 'run' API"
		);

		signature = '';
		Deno.removeSync(target);
		task('exec', [], async () => await execute(normalTask, normalTask, target));
		await run('exec');
		assertEquals(
			signature,
			normalTask + normalTask + target,
			"'execute' API should should execute serially"
		);

		signature = '';
		await run('exec');
		assertEquals(
			signature,
			normalTask + normalTask,
			"'execute' API should skip up to date task actions"
		);

		let counter = 0;
		// deno-lint-ignore require-await
		task('async', [], async () => (counter += 1));
		task('execAsync', [], async () => await execute(...Array(10).fill('async')));
		await run('execAsync');
		assertEquals(counter, 10, "'execute' API should run async task actions 10 times");
	} finally {
		env('--directory', savedCwd);
		Deno.removeSync(tmpDir, { recursive: true });
	}
});
