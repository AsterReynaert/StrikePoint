import { Option } from "./option";

export function calcPayoff(option: Option, price: bigint): bigint {
    if (price === 0n) return 0n;

    const diff =
        option.optionType === 0
            ? price > option.strikePrice ? price - option.strikePrice : 0n //call
            : price < option.strikePrice ? option.strikePrice - price : 0n; //put

    const payoff = (option.collateral * diff) / price; //same as contract
    return payoff > option.collateral ? option.collateral : payoff; 
}