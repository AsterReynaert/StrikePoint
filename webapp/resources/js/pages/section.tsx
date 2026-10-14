import { Link } from "@inertiajs/react";
import { InformationCard } from "./informationCard";
import { Option } from "./option";
export function Section({
    title,
    options,
    role,
    emptyText,
    actionText,
    actionHref,
    ethUsd,
    useProfitBadge, 
    onExercise,
    allOptions,
    onReclaim
}: {
    title: string,
    options: Option[],
    role: "buyer" | "writer",
    emptyText: String,
    actionText: string,
    actionHref: string,
    ethUsd?: number,
    useProfitBadge: Boolean
    onExercise?: (optionId: bigint) => void,
    allOptions: Option[],
    onReclaim?: (optionId: bigint) => void
}) {
    return (
        <section className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">{title}</h1>

            {options.length === 0 ? (
                <div className="flex max-w-md flex-col gap-2 rounded border p-4">
                    <p>{emptyText}</p>
                    <Link
                        href={actionHref}
                        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                    >
                        {actionText}
                    </Link>

                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {options.map((option) => {
                        const optionId = BigInt(allOptions.findIndex((o) => o === option));

                        return (
                            <InformationCard
                                key={optionId.toString()}
                                option={option}
                                optionId={optionId}
                                type={role}
                                ethUsd={ethUsd}
                                useProfitBadge={useProfitBadge}
                                onExercise={onExercise ?? (() => {})}
                                onReclaim={onReclaim ?? (() => {})}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
}