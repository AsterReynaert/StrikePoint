import { formatUnits } from "viem";

export function profitBadge({
    optionType,
    strikePrice,
    finalPrice,
    ethUsd,
}: {
    optionType: number;
    strikePrice: bigint;
    finalPrice: bigint;  
    ethUsd: number;
}) {
    const settled = finalPrice > 0n;
    const strike = Number(formatUnits(strikePrice, 2));
    const price = settled ? Number(formatUnits(finalPrice, 2)) : ethUsd;

    //optiontype === 0 => CALL
    const diff = optionType === 0 ? price - strike : strike - price;
    const inTheMoney = diff > 0;

    return (
        <p
            className={
                "inline-flex w-fit items-center px-2.5 py-0.5 text-xs font-medium " +
                (inTheMoney
                    ? "bg-green-500/15 text-green-600"
                    : "bg-red-500/15 text-red-600")
            }
        >
            {inTheMoney
                ? `In the money by $${diff.toFixed(2)}`
                : "Out of the money"}
            {settled ? " (settled)" : ""}
        </p>
    );
}