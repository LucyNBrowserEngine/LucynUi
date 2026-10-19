#!/usr/bin/env bun
import { run } from "../cli/index";

await run(process.argv.slice(2));
