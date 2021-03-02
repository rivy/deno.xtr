/* Drake APIs. */
export { env } from './src/lib/env.ts';
export type { EnvValue } from './src/lib/env.ts';
export { desc, execute, run, task } from './src/lib/registry.ts';
export type { Action, Task } from './src/lib/tasks.ts';
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
	vers,
	writeFile,
} from './src/lib/utils.ts';
export type { ShCaptureOpts, ShOpts, ShOutput } from './src/lib/utils.ts';

import { Env, env } from './src/lib/env.ts';
import { help } from './src/lib/help.ts';
import { vers } from './src/lib/utils.ts';

env('--abort-exits', true);

(env() as Env).parseArgs([...Deno.args]);

if (env('--help')) {
	help();
} else if (env('--version')) {
	console.log(vers());
}
