import { useState, useEffect } from "react";

export function EthPrice({price, text = "ETH/USD: ", className}: {price?: number, text?: string, className: string}) {
    return <p className={className}>{text}{price}</p>;
}