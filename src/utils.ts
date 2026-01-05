import { platform } from "node:os"

import { fcmd, SPAWN_MISSING_EXE_CODE } from "fluent-command"
import type { ResultAsync } from "neverthrow"
import { objectKeys } from "zerde"

import { logError, logFatal } from "./logging"

export function isEmptyObject<T extends Record<string, unknown>>(obj: T) {
    return objectKeys(obj).length === 0
}

export function isNonEmptyObject<T extends Record<string, unknown>>(obj: T) {
    return !isEmptyObject(obj)
}

export async function programExists(programName: string) {
    const finder = platform() === "win32" ? "where" : "which"
    return fcmd(finder, programName)
        .read()
        .match(
            () => true,
            (commandError) => {
                if (commandError.code === SPAWN_MISSING_EXE_CODE) {
                    logFatal(
                        `Could not find the program finder command: "${finder}". Yo dawg.`,
                    )
                }
                return false
            },
        )
}

export async function expectResult<
    SomeSuccess,
    SomeError extends string | Error,
>(
    asyncResult: ResultAsync<SomeSuccess, SomeError>,
    createMessage: (someError: SomeError) => string | undefined,
) {
    const result = await asyncResult
    if (result.isOk()) {
        return result.value
    }

    const msg = createMessage(result.error)
    if (msg) {
        logError(msg)
        logFatal(result.error)
    }
    process.exit(1)
}
