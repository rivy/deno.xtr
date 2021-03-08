import {
	abort,
	TaskError,
	glob,
	makeDir,
	quote,
	readFile,
	sh,
	shCapture,
	updateFile,
	writeFile,
} from '../src/lib/utils.ts';
import {
	assert,
	assertEquals,
	assertNotEquals,
	assertStringIncludes,
	assertThrows,
	assertThrowsAsync,
	path,
} from './deps.ts';

const testFileName = path.parse(import.meta.url).name;
function name(name: string) {
	return testFileName + name;
}

Deno.test(name('abortTest'), function () {
	assertThrows(() => abort('Abort test'), TaskError, 'Abort test');
});

Deno.test(name('fileFunctionsTest'), function () {
	const tmpDir = Deno.makeTempDirSync();
	try {
		// Read, write update tests.
		const file = path.join(tmpDir, 'fileTest');
		const text = 'foobar';
		writeFile(file, text);
		assertEquals(readFile(file), text);
		assertEquals(updateFile(file, /o/g, 'O!'), true);
		assertEquals(readFile(file), 'fO!O!bar');
		assertEquals(updateFile(file, /o/g, 'O!'), false);
		assertEquals(updateFile(file, /zzz/g, 'O!'), false);
		assertThrows(() => readFile('non-existent file'), TaskError, 'readFile: non-existent file');
		const filename = path.join('dir', 'non-existent file');
		assertThrows(() => writeFile(filename, text), TaskError, `writeFile: ${filename}`);
		const dir = path.join(tmpDir, 'c/d/e');
		assert(makeDir(dir), 'directory should not have already existed');
		assert(Deno.statSync(dir).isDirectory, 'directory should have been created');
		assert(!makeDir(dir), 'directory should have already existed');
		assert(Deno.statSync(dir).isDirectory, 'directory should exist');
		Deno.removeSync(dir);
		writeFile(dir, '');
		assertThrows(() => makeDir(dir), TaskError, `file is not directory: ${dir}`);
	} finally {
		Deno.removeSync(tmpDir, { recursive: true });
	}
});

Deno.test(name('globTest'), function () {
	let files = glob('./mod.ts', './src/lib/*.ts');
	assertEquals(
		files,
		[
			'src/lib/deps.ts',
			'src/lib/env.ts',
			'src/lib/graph.ts',
			'src/lib/help.ts',
			'src/lib/registry.ts',
			'src/lib/tasks.ts',
			'src/lib/utils.ts',
			'mod.ts',
		]
			.map((p) => path.normalize(p))
			.sort()
	);
	files = glob('./mod.ts', './src/lib/!(deps|registry|graph|utils).ts');
	assertEquals(
		files,
		['src/lib/env.ts', 'src/lib/help.ts', 'src/lib/tasks.ts', 'mod.ts']
			.map((p) => path.normalize(p))
			.sort()
	);
	const tmpDir = Deno.makeTempDirSync();
	try {
		makeDir(path.join(tmpDir, 'a/b'));
		const fixtures = ['a/b/z.ts', 'a/y.ts', 'u', 'x.ts'].map((f) => path.join(tmpDir, f)).sort();
		fixtures.forEach((f) => writeFile(f, ''));
		files = glob(...['**/*.ts', 'u'].map((f) => path.join(tmpDir, f)));
		assertEquals(files, fixtures);
		assertEquals(glob(path.join(tmpDir, 'non-existent-file')), []);
		const saved = Deno.cwd();
		try {
			Deno.chdir(tmpDir);
			files = glob('./**/*.ts', 'u');
			assertEquals(
				files,
				['./u', 'a/b/z.ts', 'a/y.ts', 'x.ts'].map((p) => path.normalize(p)).sort()
			);
			files = glob('./**/@(x|y).ts');
			assertEquals(files, ['a/y.ts', 'x.ts'].map((p) => path.normalize(p)).sort());
			Deno.chdir('a');
			files = glob('../**/*.ts');
			assertEquals(
				files,
				['../a/b/z.ts', '../a/y.ts', '../x.ts'].map((p) => path.normalize(p)).sort()
			);
		} finally {
			Deno.chdir(saved);
		}
	} finally {
		Deno.removeSync(tmpDir, { recursive: true });
	}
});

Deno.test(name('quoteTest'), function () {
	assertEquals(quote(['foo', '"bar"']), '"foo" "\\"bar\\""');
});

Deno.test(name('shTest'), async function () {
	await sh('echo Hello', { stdout: 'null' });
	await assertThrowsAsync(
		async () => await sh('non-existent-command', { stderr: 'null' }),
		TaskError,
		'sh: non-existent-command: error code:'
	);
	await sh(['echo Hello 1', 'echo Hello 2', 'echo Hello 3'], { stdout: 'null' });
});

Deno.test(name('shCaptureTest'), async function () {
	let { code, output, error } = await shCapture('echo Hello');
	assertEquals([code, output.trimRight(), error], [0, 'Hello', '']);

	({ code, output, error } = await shCapture('a-nonexistent-command', { stderr: 'piped' }));
	assertNotEquals(code, 0);
	assertEquals(output, '');
	assertStringIncludes(error, 'a-nonexistent-command');

	const cat = `deno eval "Deno.copy(Deno.stdin, Deno.stdout)"`;
	({ code, output, error } = await shCapture(cat, { input: 'Hello' }));
	assertEquals([code, output, error], [0, 'Hello', '']);

	({ code, output, error } = await shCapture(cat, { input: '' }));
	assertEquals([code, output, error], [0, '', '']);

	const text = readFile('taskfile.ts');
	({ code, output, error } = await shCapture(cat, { input: text }));
	assertEquals([code, output, error], [0, text, '']);

	({ code, output, error } = await shCapture(`deno eval "console.log(Deno.cwd())"`, {
		cwd: 'src/lib',
	}));
	assertEquals([code, output.trimRight(), error], [0, path.join(Deno.cwd(), 'src/lib'), '']);

	({ code, output, error } = await shCapture(
		`deno eval "console.log(Deno.env.get('FOO')+Deno.env.get('BAR'))"`,
		{
			env: { FOO: 'foo', BAR: 'bar' },
		}
	));
	assertEquals([code, output.trimRight(), error], [0, 'foobar', '']);

	({ code, output, error } = await shCapture('echo Hello', { stdout: 'null', stderr: 'null' }));
	assertEquals([code, output, error], [0, '', '']);

	({ code, output, error } = await shCapture(cat, {
		input: '',
		stdout: 'inherit',
		stderr: 'inherit',
	}));
	assertEquals([code, output, error], [0, '', '']);

	({ code, output, error } = await shCapture(
		`cd examples
     deno eval "console.log(Deno.cwd())"`
	));
	assertEquals([code, output.trimRight(), error], [0, path.join(Deno.cwd(), 'examples'), '']);
});
