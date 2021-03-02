/* APIs that can be used in non-Drake modules. */
export { env } from './src/lib/env.ts';
export {
	abort,
	debug,
	TaskError,
	glob,
	log,
	makeDir,
	quote,
	readFile,
	sh,
	shCapture,
	updateFile,
	writeFile,
} from './src/lib/utils.ts';
export type { ShCaptureOpts, ShOpts, ShOutput } from './src/lib/utils.ts';
