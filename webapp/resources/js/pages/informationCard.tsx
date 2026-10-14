import { Option } from "./option";
import { profitBadge as ProfitBadge } from "./profitBadge";
import { ZERO_ADDRESS } from "../lib/contract";
import { formatEther, formatUnits, parseUnits } from "viem";
import { calcPayoff } from "./calcPayoff";

export function InformationCard({
    option,
    optionId,
    type,
    ethUsd,
    useProfitBadge,
    onExercise,
    onReclaim,
}: {
    option: Option;
    optionId: bigint;
    type: "buyer" | "writer";
    ethUsd?: number;
    useProfitBadge: Boolean;
    onExercise: (optionId: bigint) => void;
    onReclaim: (optionId: bigint) => void;
}) {
    const expired = Number(option.expirationDate) * 1000 <= Date.now();
    const sold = option.buyer !== ZERO_ADDRESS;
    const settled = option.finalPrice > 0n;
    const exercised = option.lockedFunds === 0n;

    const priceCents = settled
        ? option.finalPrice
        : ethUsd !== undefined
          ? parseUnits(ethUsd.toFixed(2), 2)
          : 0n; // if settled use settled price else use live price
    const payoff = calcPayoff(option, priceCents);

    //buyer => payout - premium payed, writer => premium recieved - payout
    const net =
        type === "buyer" ? payoff - option.premium : option.premium - payoff; //wei

    const netUsd =
        Number(formatEther(net)) * Number(formatUnits(priceCents, 2)); //eth * $/eth  => $

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
                    <span>{formatEther(option.collateral)} ETH</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Final Settled Price</span>
                    <span>
                        {settled
                            ? `$${formatUnits(option.finalPrice, 2)}`
                            : "Not settled yet"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-slate-500">Expiration</span>
                    <span
                        className={expired ? "text-red-600 font-semibold" : ""}
                    >
                        {new Date(
                            Number(option.expirationDate) * 1000,
                        ).toLocaleString()}
                        {expired && " (expired)"}
                    </span>
                </div>
            </div>

            {sold && priceCents > 0n && (
                <>
                    <div className="flex justify-between">
                        <span className="text-slate-500">
                            {type === "buyer"
                                ? "Payout to buyer"
                                : "Payout owed"}
                        </span>
                        <span>{formatEther(payoff)} ETH</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-slate-500">
                            {settled
                                ? "Profit / loss"
                                : "Estimated profit / loss"}
                        </span>
                        <span
                            className={
                                net >= 0n
                                    ? "font-semibold text-green-600"
                                    : "font-semibold text-red-600"
                            }
                        >
                            {net >= 0n ? "+" : ""}
                            {formatEther(net)} ETH (≈ {netUsd >= 0 ? "+" : "-"}$
                            {Math.abs(netUsd).toFixed(2)})
                        </span>
                    </div>
                </>
            )}

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
            {type === "writer" &&
                !sold &&
                expired &&
                option.lockedFunds > 0n && (
                    <button
                        onClick={() => onReclaim(optionId)}
                        className="mt-4 w-full rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
                    >
                        Reclaim {formatEther(option.lockedFunds)} ETH
                    </button>
                )}
            {type === "writer" &&
                !sold &&
                expired &&
                option.lockedFunds === 0n && ( //lockedFunds === 0 => collateral reclaimed!
                    <p className="mt-3 text-center text-xs font-semibold text-green-600">
                        Collateral reclaimed
                    </p>
                )}
        </div>
    );
}
