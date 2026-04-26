import type { Prettify } from "zerde"
import { objectEntries, objectKeys } from "zerde"
import z from "zod"

import { OS_INFO, safeRenderTemplate } from "$/lib/templates"
import { logError, logFatal } from "$/logging"
import { expectResult, isEmptyObject, isNonEmptyObject } from "$/utils"

const NOT_USED_PROFILE_SCORE = 100
const HOSTNAME_MATCH_PROFILE_SCORE = 1000

const nonEmptyRecord = [
    isNonEmptyObject,
    { error: "Object cannot be empty." },
] as const

export const upacPackageManagerSchema = z.object({
    install: z
        .array(
            z
                .string()
                .nonempty({ error: "Install arg must be nonempty string." }),
        )
        .nonempty({ error: "Must provide install args." }),
})

export const upacPackageConfigSchema = z
    .object({
        binary: z.string().nonempty({ error: "Must provide binary name." }),
    })
    .partial()

type UPACPackageConfig = z.infer<typeof upacPackageConfigSchema>

export type UPACPackageEntry = Prettify<
    {
        packageName: string
    } & UPACPackageConfig
>

export const upacProfileSchema = z.object({
    packageManager: z.string(),
    packages: z
        .record(z.string(), upacPackageConfigSchema)
        .refine(...nonEmptyRecord),
    when: z.array(z.string()).min(1).optional(),
})

type UPACProfile = z.infer<typeof upacProfileSchema>
type UPACProfilePackages = UPACProfile["packages"]

export const upacConfigSchema = z
    .object({
        packageManagers: z
            .record(z.string(), upacPackageManagerSchema)
            .refine(...nonEmptyRecord),
        profiles: z
            .record(z.string(), upacProfileSchema)
            .refine(...nonEmptyRecord),
    })
    .transform(async (cfg, { addIssue }) => {
        const allPackageManagers = objectKeys(cfg.packageManagers)
        if (isEmptyObject(cfg.packageManagers)) {
            addIssue({
                code: "custom",
                message: "Must declare at least one package manager.",
                path: ["packageManagers"],
            })
            return z.NEVER
        }
        for (const [profileName, { packageManager }] of objectEntries(
            cfg.profiles,
        )) {
            if (!allPackageManagers.includes(packageManager)) {
                const message = `Profile "${profileName}" used package manager "${packageManager}" that is not one of the declared package managers: ${allPackageManagers.map((item) => `"${item}"`).join(", ")}. Either use one of the declared package managers or add "${packageManager}" to package managers.`
                addIssue({
                    code: "custom",
                    input: packageManager,
                    message,
                    path: ["profiles", profileName, "packageManager"],
                })
                return z.NEVER
            }
        }
        const scoredProfiles: Array<{
            profileName: string
            packageManager: string
            score: number
            packages: UPACProfilePackages
        }> = []
        for (const [profileName, profileConfig] of objectEntries(
            cfg.profiles,
        )) {
            let score = 0
            if (profileName === OS_INFO.hostname) {
                score === HOSTNAME_MATCH_PROFILE_SCORE
            } else {
                for (const [predicateIndex, predicate] of (
                    profileConfig.when ?? []
                ).entries()) {
                    const renderedResult = await expectResult(
                        safeRenderTemplate(predicate),
                        (err) => {
                            logError(
                                `Error rendering profile "${profileName}" when condition ${predicateIndex}`,
                            )
                            logFatal(err)
                        },
                    )
                    if (renderedResult === "true") {
                        score++
                    } else {
                        score -= NOT_USED_PROFILE_SCORE
                        break
                    }
                }
            }
            scoredProfiles.push({
                profileName,
                packageManager: profileConfig.packageManager,
                score,
                packages: profileConfig.packages,
            })
        }
        const filteredProfiles = scoredProfiles.filter(
            (profile) => profile.score >= 0,
        )
        if (filteredProfiles.length === 0) {
            addIssue({
                code: "custom",
                input: scoredProfiles,
                message: "No profile passed checks.",
                path: ["profiles"],
            })
            return z.NEVER
        }
        const sortedProfiles = filteredProfiles
            .sort((profileA, profileB) => {
                const scoreDiff = profileB.score - profileA.score
                if (scoreDiff !== 0) {
                    return scoreDiff
                }
                return profileA.profileName.localeCompare(profileB.profileName)
            })
            .reverse()

        const mergedPackages: Record<
            string,
            { packageManager: string; binary?: string | undefined }
        > = {}

        for (const sortedProfile of sortedProfiles) {
            objectEntries(sortedProfile.packages).forEach(
                ([packageName, { binary }]) => {
                    mergedPackages[packageName] = {
                        packageManager: sortedProfile.packageManager,
                        binary,
                    }
                },
            )
        }
        const mergedPackagesArray = objectEntries(mergedPackages).map(
            ([packageName, packageInfo]) => ({
                packageName,
                packageManager: packageInfo.packageManager,
                binary: packageInfo.binary,
            }),
        )
        return {
            packageManagers: cfg.packageManagers,
            packages: mergedPackagesArray,
        }
    })

export type UpacConfig = z.infer<typeof upacConfigSchema>

export const upacVariablesSchema = z.record(z.string(), z.json())
