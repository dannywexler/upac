#!/usr/bin/env node

import { cli } from "./cli"
import { runWithValidConfig } from "./config/config.impl"

await runWithValidConfig(() => cli.parse())
