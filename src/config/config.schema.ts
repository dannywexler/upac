import z from "zod"

import { isNonEmptyObject } from "$/utils"

const nonEmptyRecord = [
    isNonEmptyObject,
    { error: "Object cannot be empty." },
] as const

export const upacPackageManagerSchema = z.object({
    install: z.array(z.string()).min(1),
})

export const upacProfileSchema = z.object({
    packageManager: z.string(),
    programs: z.record(z.string(), z.string()).refine(...nonEmptyRecord),
})

export const upacConfigSchema = z
    .object({
        packageManagers: z
            .record(z.string(), upacPackageManagerSchema)
            .refine(...nonEmptyRecord),
        profiles: z
            .record(z.string(), upacProfileSchema)
            .refine(...nonEmptyRecord),
    })
    .superRefine((cfg, ctx) => {
        const allPackageManagers = Object.keys(cfg.packageManagers)
        if (allPackageManagers.length === 0) {
            return ctx.addIssue({
                code: "custom",
                message: "Must declare at least one package manager.",
                path: ["packageManagers"],
            })
        }
        for (const [profileName, { packageManager }] of Object.entries(
            cfg.profiles,
        )) {
            if (!allPackageManagers.includes(packageManager)) {
                const message = `Profile "${profileName}" used package manager "${packageManager}" that is not one of the declared package managers: ${allPackageManagers.map((item) => `"${item}"`).join(", ")}. Either use one of the declared package managers or add "${packageManager}" to package managers.`
                ctx.addIssue({
                    code: "custom",
                    input: packageManager,
                    message,
                    path: ["profiles", profileName, "packageManager"],
                })
            }
        }
    })

export type UpacConfig = z.infer<typeof upacConfigSchema>
