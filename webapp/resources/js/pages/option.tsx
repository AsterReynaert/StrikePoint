


export type Option = {
    writer: `0x${string}`;
    buyer: `0x${string}`;
    optionType: OptionType;
    strikePrice: bigint;
    premium: bigint;
    expirationDate: bigint;
    lockedFunds: bigint;
    finalPrice: bigint;
};


export enum OptionType {
    CALL = 0,
    PUT = 1,
}