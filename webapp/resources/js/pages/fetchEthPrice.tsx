import { useEffect, useState } from "react";


export function fetchEthPrice(intervalMs = 30000){
    const [price, setPrice] = useState<number>();


    useEffect(() => {
        async function load(){
            const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${import.meta.env.VITE_ETHERSCAN_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status !== "1") {
    console.warn("Etherscan error:", data);
    return;
}
            setPrice(data.result.ethusd);
        }
        load();
        const id = setInterval(load, intervalMs)
        return () => clearInterval(id); //clears the interval on unmount
    }, [intervalMs])

    return price;


}