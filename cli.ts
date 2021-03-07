import * as Dex from './mod.ts';

// console.log({ args: Deno.args });
// const r1 = await Deno.run({ cmd: ['echo', 'run', '-A', ...Deno.args] }).status();
const ret = await Deno.run({ cmd: ['deno', 'run', '-A', ...Deno.args] }).status();
// console.log({ r1, r2 });

const args = [...Deno.args].shift();
Dex.run(...(args || []));
