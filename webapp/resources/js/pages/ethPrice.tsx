import { useState, useEffect } from "react";

export function EthPrice() {
        const [usd, setUsd] = useState<string>("Loading…");

        useEffect(() => {
            const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${import.meta.env.VITE_ETHERSCAN_KEY}`;
            console.log(url);
            fetch(url)
                .then((res) => res.json())
                .then((data) => {
                    console.log(data);
                    setUsd(data.result.ethusd);
                });
        }, []);

        return <p>ETH/USD: ${usd}</p>;
    }


