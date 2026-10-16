import { Head, Link } from "@inertiajs/react";
import { dashboard } from "@/routes";
import { useState, useEffect, useRef } from "react";
import {
    Address,
    createPublicClient,
    createTestClient,
    createWalletClient,
    custom,
    formatEther,
    http,
    parseUnits,
} from "viem";
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
    const ethUsd = fetchEthPrice();

    const [address, setAddress] = useState<Address>();
    const [connectError, setConnectError] = useState<string>("");
    const [options, setOptions] = useState<Option[]>([]);
    const [balance, setBalance] = useState<bigint>();

    const optionsRef = useRef<Option[]>([]);
    const priceRef = useRef<number | undefined>(undefined);
    const settlingRef = useRef(false);
    const addressRef = useRef<Address | undefined>(undefined);

    useEffect(() => {
        addressRef.current = address;
        optionsRef.current = options;
        priceRef.current = ethUsd;
    }, [options, address, ethUsd])

    

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

        const results = await Promise.all(promisedOptions);

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
                    collateral,
                ]) => ({
                    writer,
                    buyer,
                    optionType,
                    strikePrice,
                    premium,
                    expirationDate,
                    lockedFunds,
                    finalPrice,
                    collateral,
                }),
            ),
        );
    }

    async function autoSettle(optionId: bigint, currentPrice: number) {
        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });
        const publicClient = createPublicClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });

        const [account] = await walletClient.requestAddresses();

        const { request } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "settlePrice",
            args: [optionId, parseUnits(currentPrice.toFixed(2), 2)], // Convert currentPrice to a BigInt with 2 decimal places
            account,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        fetchOptions(); // Refresh the options state
    }

    async function checkSettled() {
        const opts = optionsRef.current;
        const price = priceRef.current;
        const currentSettler = addressRef.current?.toLowerCase()
        if (price === undefined) return;
        if (settlingRef.current)
            //already settling so dont do anything
            return;

        settlingRef.current = true; //lock
        try {
            const publicClient = createPublicClient({
                chain: hardhat,
                transport: custom(window.ethereum),
            });
            const block = await publicClient.getBlock();

            for (let i = 0; i < opts.length; i++) {
                const option = opts[i];
                if (                    
                    option.buyer.toLowerCase() === currentSettler && //only the buyer can settle
                    option.buyer !== ZERO_ADDRESS && //option has been bought
                    option.expirationDate <= block.timestamp && //option has expired
                    option.finalPrice === 0n //not settled yet
                ) {
                    await autoSettle(BigInt(i), price);
                    break;
                }
            }
        } catch (e) {
            console.error("Auto-settle failed", e);
        } finally {
            settlingRef.current = false; //unlock
        }
    }

    useEffect(() => {
        connectToWallet();
        fetchOptions();

        const testClient = createTestClient({
            chain: hardhat,
            mode: "hardhat",
            transport: http("http://127.0.0.1:8545"),
        });
        testClient.setIntervalMining({ interval: 1 }); //auto mining to keep the block.timestamp current (every second)

        const refreshOptions = setInterval(fetchOptions, 5000); //refreshes the options to keep the data current
        return () => clearInterval(refreshOptions);
    }, []);

    useEffect(() => {
        const timer = setInterval(checkSettled, 3000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!address) return;
        const walletAddress = address;

        const publicClient = createPublicClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });

        async function fetchBalance() {
            setBalance(
                await publicClient.getBalance({ address: walletAddress }),
            );
        }

        fetchBalance();
        const timer = setInterval(fetchBalance, 3000);
        return () => clearInterval(timer);
    }, [address]);

    async function handleExercise(optionId: bigint) {
        if (!address || !window.ethereum) {
            setConnectError("Connect your wallet first.");
            return;
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });
        const publicClient = createPublicClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });

        const { request } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "exerciseOption",
            args: [optionId],
            account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        fetchOptions();
    }

    async function handleReclaim(optionId: bigint) {
        if (!address || !window.ethereum) {
            setConnectError("Connect your wallet first.");
            return;
        }

        const walletClient = createWalletClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });
        const publicClient = createPublicClient({
            chain: hardhat,
            transport: custom(window.ethereum),
        });

        try {
            const { request } = await publicClient.simulateContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "reclaimFunds",
                args: [optionId],
                account: address,
            });

            const hash = await walletClient.writeContract(request);
            await publicClient.waitForTransactionReceipt({ hash });
            fetchOptions();
        } catch (e) {
            console.error(e);
            setConnectError("Reclaim failed: " + (e as Error).message);
        }
    }

    function sameAddress(a: string, b: string | undefined) {
        return b !== undefined && a.toLowerCase() === b.toLowerCase();
    }

    const boughtOptions = options.filter((o) => sameAddress(o.buyer, address));
    const writtenOptions = options.filter((o) =>
        sameAddress(o.writer, address),
    );

    return (
        <>
            <Head title="Dashboard" />

            <p>
                Balance: {balance !== undefined ? formatEther(balance) : "loading..."}{" "}
                ETH
            </p>

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
                    useProfitBadge={true}
                    onExercise={handleExercise}
                    allOptions={options}
                />
                <Section
                    title="Options you wrote:"
                    options={writtenOptions}
                    role="writer"
                    emptyText="You haven't written any options yet."
                    actionText="Write an option"
                    actionHref="/write-option"
                    ethUsd={ethUsd}
                    allOptions={options}
                    useProfitBadge={false}
                    onReclaim={handleReclaim}
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
