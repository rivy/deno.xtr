// deno-lint-ignore-file no-explicit-any

import { Env } from '../src/lib/env.ts';
import { TaskError } from '../src/lib/utils.ts';
import { assertEquals, assertThrows } from './deps.ts';

Deno.test('envTest', function () {
	const env = Env.create();
	const opts = [
		// "--abort-exits",
		'--always-make',
		// "--debug",
		'--cache',
		'--default-task',
		'--directory',
		'--dry-run',
		'--help',
		'--list-all',
		'--list-tasks',
		'--quiet',
		'--version',
	];
	for (const opt of opts) {
		switch (opt) {
			case '--cache':
				assertEquals(env(opt), '');
				break;
			case '--default-task':
				assertEquals(env(opt), '');
				env(opt, 'foobar');
				assertEquals(env(opt), 'foobar');
				env(opt, '');
				assertEquals(env(opt), '');
				break;
			case '--directory':
				assertEquals(env(opt), Deno.cwd());
				break;
			default:
				assertEquals(env(opt), false);
				env(opt, true);
				assertEquals(env(opt), true);
				env(opt, false);
				assertEquals(env(opt), false);
		}
		assertThrows(() => env(opt, undefined), TaskError, `${opt} must be a`);
		assertThrows(() => env(opt, 42 as any), TaskError, `${opt} must be a`);
	}
	assertThrows(() => env('-foobar', 'quux'), TaskError, 'illegal option: -foobar');
	assertThrows(() => env('foo-bar', 'quux'), TaskError, 'illegal variable name: foo-bar');
	env('--tasks', []);
	assertEquals(env('--tasks'), []);
	assertThrows(() => env('--tasks', 'quux'), TaskError, '--tasks must be a string array');
	assertThrows(() => env('--tasks', [1, 2, 3] as any), TaskError, '--tasks must be a string array');
});
