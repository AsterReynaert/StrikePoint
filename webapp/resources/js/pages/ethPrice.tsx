import { useState, useEffect } from "react";

export function EthPrice({price}: {price?: number}) {
    return <p>ETH/USD: {price}</p>;
}

