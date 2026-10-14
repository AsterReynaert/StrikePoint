import { Option } from "./option";
import { profitBadge as ProfitBadge } from "./profitBadge";
import { ZERO_ADDRESS } from "../lib/contract";
import { formatEther, formatUnits } from "viem";

export function InformationCard({
    option,
    optionId,
    type,
    ethUsd,
    useProfitBadge,
    onExercise
}: {
    option: Option;
    optionId: bigint;
    type: "buyer" | "writer";
    ethUsd?: number;
    useProfitBadge: Boolean;
    onExercise: (optionId: bigint) => void;
}) {
    const expired = Number(option.expirationDate) * 1000 <= Date.now();
    const sold = option.buyer !== ZERO_ADDRESS;
    const settled = option.finalPrice > 0n;
    const exercised = option.lockedFunds === 0n;

    return (
        <div className="rounded border p-4 hover:shadow">
            <div className="mb-3 flex items-center justify-between border-b pb-2">
                <p>
                    <strong>Type:</strong>
                    {option.optionType === 0 ? " CALL" : " PUT"}
                </p>
                {useProfitBadge && ethUsd !== undefined && (
                    <ProfitBadge
                        optionType={option.optionType}
                        strikePrice={option.strikePrice}
                        finalPrice={option.finalPrice}
                        ethUsd={ethUsd}
                    />
                )}
            </div>

            <div className="space-y-1.5 text-sm">
                {type === "buyer" ? (
                    <div className="flex justify-between">
                        <span className="text-slate-500">Writer</span>
                        <span> {option.writer}</span>
                    </div>
                ) : (
                    <div className="flex justify-between">
                        <span className="text-slate-500">Buyer</span>
                        <span>{sold ? option.buyer : "Not bought yet"}</span>
                    </div>
                )}

                <div className="flex justify-between">
                    <span className="text-slate-500">Strike Price</span>
                    <span>${formatUnits(option.strikePrice, 2)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Premium</span>
                    <span>{formatEther(option.premium)} ETH</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Locked funds</span>
                    <span>{formatEther(option.lockedFunds)} ETH</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Final Settled Price</span>
                    <span>{settled ? `$${formatUnits(option.finalPrice, 2)}` : "Not settled yet"}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Expiration</span>
                    <span className={expired ? "text-red-600 font-semibold" : ""}>
                        {new Date(
                            Number(option.expirationDate) * 1000,
                        ).toLocaleString()}
                        {expired && " (expired)"}
                    </span>
                </div>
            </div>

            {type === "buyer" && expired && settled && !exercised && (
                <button
                    onClick={() => onExercise(optionId)}
                    className="mt-4 w-full rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                    Exercise Option
                </button>
            )}
            {type === "buyer" && exercised && (
                <p className="mt-3 text-center text-xs font-semibold text-green-600">
                    Option Exercised 
                </p>
            )}
        </div>
    );
}