export { help };

function help(): void {
	console.log(manpage);
}

const manpage = String.raw`
NAME
  dexter - a make-like task runner for Deno.

SYNOPSIS
  deno run -A TASKFILE [OPTION|VARIABLE|TASK]...

DESCRIPTION
  The XTR module provides functions for defining and executing TASKs using the Deno runtime.

  A TASKFILE is a TypeScript module file containing XRT-based task definitions.
  TASKFILEs may be run with the Deno 'run' command.

  A VARIABLE is a named string value e.g. 'vers=0.1.0'.  Variables are
  accessed using the Drake 'env' API e.g. 'env("vers")'.

OPTIONS
  -a, --always-make     Unconditionally execute tasks.
  --cache FILE          Set cache file path to FILE.
  -d, --directory DIR   Change to directory DIR before running TASKFILE.
  -D, --debug           Write debug information to stderr.
  -h, --help            Display this help message.
  -l, -L, --list-tasks  List tasks (-L for hidden tasks and prerequisites).
  -n, --dry-run         Skip task execution.
  -q, --quiet           Do not log messages to standard output.
  --version             Display the version.

ENVIRONMENT VARIABLES
  NO_COLOR              Set to disable color (see https://no-color.org/).

SEE ALSO
  The user guide: https://github.com/rivy/deno.xtr
`;
