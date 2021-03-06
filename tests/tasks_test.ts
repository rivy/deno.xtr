import { existsSync } from '../src/lib/deps.ts';
import { env } from '../src/lib/env.ts';
import {
	isFileTask,
	isNormalTask,
	normalizePath,
	normalizeTaskName,
	Task,
	TaskRegistry,
} from '../src/lib/tasks.ts';
import { TaskError, readFile, writeFile } from '../src/lib/utils.ts';
import { assert, assertEquals, assertThrows, assertThrowsAsync, path } from './deps.ts';

const testFileName = path.parse(import.meta.url).name;
function name(name: string) {
	return testFileName + ':' + name;
}

Deno.test(name('normalizePathTest'), function () {
	const tests: [string, string][] = [
		['foobar', './foobar'],
		['lib/io.ts', 'lib/io.ts'],
		['/tmp//foobar', '/tmp/foobar'],
		['/tmp/./foobar', '/tmp/foobar'],
		['/tmp/../foobar', '/foobar'],
	];
	for (const [name, expected] of tests) {
		assertEquals(normalizePath(name), normalizePath(expected));
	}
});

Deno.test(name('normalizeTaskNameTest'), function () {
	const tests = [[' foobar', 'foobar'], ['lib/io.ts', 'lib/io.ts'].map((p) => normalizePath(p))];
	for (const [name, expected] of tests) {
		assertEquals(normalizeTaskName(name), expected);
	}
	assertThrows(() => normalizeTaskName(' '), TaskError, 'blank task name');
	const name = '**/*.ts';
	assertThrows(() => normalizeTaskName(name), TaskError, `wildcard task name not allowed: ${name}`);
});

Deno.test(name('isTasksTest'), function () {
	const tests: [string, boolean][] = [
		['foobar', true],
		['--foobar', false],
		['_foo_bar_', true],
		['42-foobar', true],
		['./foobar', false],
		['foobar.ts', false],
		['/tmp/foobar', false],
		['../foobar/', false],
		['./foobar/quux', false],
		['.foobar', false],
	];
	for (const [name, expected] of tests) {
		assertEquals(isNormalTask(name), expected);
		assertEquals(isFileTask(name), !expected);
	}
});

Deno.test(name('taskRegistryTest'), async function () {
	env('--quiet', true);
	const taskRegistry = new TaskRegistry();

	assertEquals(taskRegistry.cacheFile(), path.join(Deno.cwd(), '.drake.cache.json'));
	env('--cache', 'tests/drake-test.cache.json');
	assertEquals(env('--cache'), path.join(Deno.cwd(), 'tests', 'drake-test.cache.json'));
	env('--cache', ''); // Reset default value.
	assertEquals(taskRegistry.cacheFile(), path.join(Deno.cwd(), '.drake.cache.json'));

	assertThrows(() => taskRegistry.get('quux'), TaskError, 'missing task: quux');

	const log: string[] = [];
	const action = function (this: Task) {
		log.push(this.name);
	};

	taskRegistry.desc('Task 1');
	taskRegistry.register('1', ['2', '3'], action);

	taskRegistry.desc('Task 2');
	taskRegistry.register('2', ['3'], action);

	taskRegistry.desc('Task 3');
	taskRegistry.register('3', [], action);

	assertEquals(taskRegistry.get('1').desc, 'Task 1');
	assertEquals(
		taskRegistry.resolveDependencies(['1', '3', '2']).map((task) => task.name),
		['3', '2', '1']
	);
	await taskRegistry.run('1', '2', '3');
	assertEquals(log, ['3', '2', '1'], 'execution log mismatch');

	assertEquals(
		taskRegistry.list().map((s) => s.slice(-6)),
		['Task 1', 'Task 2', 'Task 3'],
		'task list should have descriptions'
	);
	taskRegistry.get('2').desc = '';
	assertEquals(
		taskRegistry.list().map((s) => s.slice(-6)),
		['Task 1', 'Task 3'],
		'hidden tasks are not listed'
	);
	env('--list-all', true);
	try {
		assertEquals(taskRegistry.list().length, 3, '--list-all lists hidden tasks');
	} finally {
		env('--list-all', false);
	}

	taskRegistry.desc('Task 4');
	taskRegistry.register('4', ['1', '4'], action);
	taskRegistry.get('2').prereqs.push('4');
	await assertThrowsAsync(
		async () => await taskRegistry.run('4'),
		TaskError,
		"cyclic dependency between '4' and '1', cyclic dependency between '4' and '4'",
		'cyclic dependency should throw error'
	);

	taskRegistry.desc('Task 5');
	assertThrows(
		() => taskRegistry.register('5', ['1', '6', '4', '6'], action),
		TaskError,
		'5: duplicate prerequisite: 6'
	);
});

Deno.test(name('fileTaskTest'), async function () {
	env('--quiet', true);
	const taskRegistry = new TaskRegistry();

	const target = normalizePath('./target');
	const prereq = normalizePath('./prereq');
	let taskRan = false;
	// deno-lint-ignore require-await
	taskRegistry.register(target, [prereq], async function () {
		taskRan = true;
	});

	const dir = Deno.makeTempDirSync();
	const savedCwd = Deno.cwd();
	env('--directory', dir);
	try {
		const task = taskRegistry.get(target);
		writeFile(prereq, '');
		assert(task.isOutOfDate(), 'isOutOfDate should return true: no previous task cache');
		assert(task.isOutOfDate(), 'isOutOfDate should return true: missing target file');
		writeFile(target, 'quux');
		task.updateCache();
		taskRegistry.saveCache(taskRegistry.cacheFile());
		taskRegistry.loadCache(taskRegistry.cacheFile());
		assertEquals(task.cache![prereq].size, 0, 'loaded file cache prereq size should match');
		assertEquals(task.cache![target].size, 4, 'loaded file cache target size should match');

		writeFile(prereq, 'baz');
		assert(task.isOutOfDate(), 'isOutOfDate should return true: modified prerequisite file');

		taskRegistry.saveCache(taskRegistry.cacheFile());
		Deno.removeSync(prereq);
		await assertThrows(
			() => task.isOutOfDate(),
			TaskError,
			'missing prerequisite file:',
			'isOutOfDate should throw error: missing prerequisite file'
		);
		writeFile(prereq, '');
		Deno.removeSync(target);
		taskRan = false;
		await taskRegistry.run(target);
		assert(taskRan, 'task should have executed: no target file');
		assert(
			existsSync(taskRegistry.cacheFile()),
			`cache file should exist: ${taskRegistry.cacheFile()}`
		);

		writeFile(target, '');
		taskRan = true;
		await taskRegistry.run(target);
		assert(taskRan, 'task should have executed: new target file');

		taskRan = false;
		await taskRegistry.run(target);
		assert(!taskRan, 'task should not have executed: target file up to date');

		taskRan = false;
		writeFile(prereq, 'foobar');
		await taskRegistry.run(target);
		assert(taskRan, 'task should have executed: prerequisite changed');

		taskRan = false;
		await taskRegistry.run(target);
		assert(!taskRan, 'task should not have executed: target file up to date');

		Deno.removeSync(prereq);
		await assertThrowsAsync(
			async () => await taskRegistry.run(target),
			TaskError,
			'missing prerequisite file:',
			'missing prerequisite file should throw error'
		);

		env('--dry-run', true);
		try {
			// Missing prerequisite should not throw error if --dry-run.
			await taskRegistry.run(target);
		} finally {
			env('--dry-run', false);
		}

		const target2 = normalizePath('./target2');
		// deno-lint-ignore require-await
		taskRegistry.register(target2, [target], async function () {
			throw new TaskError();
		});
		writeFile(prereq, '');
		const oldCache = readFile(taskRegistry.cacheFile());
		let didThrow = false;
		try {
			await taskRegistry.run(target, target2);
		} catch {
			didThrow = true;
		}
		assert(didThrow, 'target2 task should throw an error');
		assert(
			readFile(taskRegistry.cacheFile()) !== oldCache,
			'cache file should have updated after the error was thrown'
		);

		env('--cache', 'drake-test.cache.json');
		const expected = path.join(Deno.cwd(), 'drake-test.cache.json');
		assert(taskRegistry.cacheFile(), expected);
		Deno.removeSync(target);
		taskRan = false;
		await taskRegistry.run(target);
		assert(taskRan, 'task should have executed: no target file');
		assert(existsSync(expected), `cache file should exist: ${expected}`);
	} finally {
		env('--cache', '');
		env('--directory', savedCwd);
		Deno.removeSync(dir, { recursive: true });
	}
});
