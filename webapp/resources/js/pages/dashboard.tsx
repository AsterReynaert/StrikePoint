import { Head, Link } from "@inertiajs/react";
import { dashboard } from "@/routes";
import { useState, useEffect } from "react";
import { Address, createPublicClient, createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";
import Popup from "./popup";
import { Option } from "./option";
import { Section } from "./section";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import { EthPrice } from "./ethPrice";

import EthChart from "./ethChart";
import { fetchEthPrice } from "./fetchEthPrice";




const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function Dashboard() {
    const [address, setAddress] = useState<Address>();
    const [connectError, setConnectError] = useState<string>("");
    const [options, setOptions] = useState<Option[]>([]);

    async function connectToWallet() {
        if (!window.ethereum) {
            setConnectError(
                "MetaMask is not installed. Please install it to use StrikePoint.",
            );
            return;
        }

        try {
            const walletClient = createWalletClient({
                chain: hardhat,
                transport: custom(window.ethereum),
            });
            const [account] = await walletClient.requestAddresses();
            setAddress(account);
            setConnectError(""); // closes the popup
        } catch (e) {
            setConnectError("Connection failed: " + (e as Error).message);
        }
    }

    async function fetchOptions() {
        if (!window.ethereum) return;

        const publicClient = createPublicClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });

        const count = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "optionCount",
        });

        const promisedOptions = [];
        for (let i = 0n; i < count; i++) {
            promisedOptions.push(
                publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: CONTRACT_ABI,
                    functionName: "options",
                    args: [i],
                }),
            );
        }

        const results = await Promise.all(promisedOptions); //.all makes sure that all promises are resolved before proceeding

        setOptions(
            results.map(
                ([
                    writer,
                    buyer,
                    optionType,
                    strikePrice,
                    premium,
                    expirationDate,
                    lockedFunds,
                    finalPrice,
                ]) => ({
                    writer,
                    buyer,
                    optionType,
                    strikePrice,
                    premium,
                    expirationDate,
                    lockedFunds,
                    finalPrice,
                }),
            ),
        );
    }

    // Auto connect + load options when page renders
    useEffect(() => {
        connectToWallet();
        fetchOptions();
    }, []);

    function sameAddress(a: string, b: string | undefined) {
        return b !== undefined && a.toLowerCase() === b.toLowerCase();
    }

    const boughtOptions = options.filter((o) => sameAddress(o.buyer, address));
    const writtenOptions = options.filter((o) =>
        sameAddress(o.writer, address),
    );    

    const ethUsd = fetchEthPrice();

    return (
        <>
            <Head title="Dashboard" />

            <EthPrice price={ethUsd} className="" />

            <EthChart />

            

            {connectError && (
                <Popup
                    title="Wallet error!"
                    message={connectError}
                    buttonText="Connect to Metamask"
                    onAction={connectToWallet}
                />
            )}

            <div className="flex h-full flex-col gap-8 overflow-x-auto rounded-xl p-4">
                <Section
                    title="Options you bought:"
                    options={boughtOptions}
                    role="buyer"
                    emptyText="You haven't bought any options yet."
                    actionText="Buy an option"
                    actionHref="/buy-option"
                    ethUsd={ethUsd}
                />
                <Section
                    title="Options you wrote:"
                    options={writtenOptions}
                    role="writer"
                    emptyText="You haven't written any options yet."
                    actionText="Write an option"
                    actionHref="/write-option"
                    ethUsd={ethUsd}
                />
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: "StrikePoint",
            href: dashboard(),
        },
    ],
};
