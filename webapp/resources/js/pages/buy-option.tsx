import { Head, router } from "@inertiajs/react";
import { useEffect, useState } from "react";
import {
    createWalletClient,
    createPublicClient,
    custom,
    type Address,
    formatEther,
    createTestClient,
    http,
} from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import Popup from "./popup";
import { dashboard } from "@/routes";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; //address to check if the option is sold or not

type Option = {
    writer: Address;
    buyer: Address;
    optionType: number;
    strikePrice: bigint;
    premium: bigint;
    expirationDate: bigint;
    lockedFunds: bigint;
    finalPrice: bigint;
};

export default function BuyOption() {
    const [address, setAddress] = useState<Address>();
    const [connectError, setConnectError] = useState<string>("");
    const [options, setOptions] = useState<Option[]>([]);
    const [chainTime, setChainTime] = useState<bigint>(0n);


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
        const block = await publicClient.getBlock();
        setChainTime(block.timestamp);

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

        const testClient = createTestClient({ //to setup auto mining
            chain: hardhat,
            mode: "hardhat",
            transport: http("http://127.0.0.1:8545"),
        });

        testClient.setIntervalMining({ interval: 1 }) //auto mine a block every second so the block.timestamp gets updated
    }, []);

    

    async function handleBuyOption(optionId: bigint, premium: bigint) {
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
            functionName: "buyOption",
            args: [optionId],
            value: premium,
            account: address,
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        router.visit(dashboard());
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

    

    return (
        <>
            <Head title="Buy" />

            {connectError && (
                <Popup
                    title="Wallet error!"
                    message={connectError}
                    buttonText="Connect to Metamask"
                    onAction={connectToWallet}
                />
            )}

            <div className="flex flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {options.length === 0 && <p>No options available</p>}
                <div className="flex flex-col gap-4">
                    {options.map((option, index) => {
                        const expired = option.expirationDate <= chainTime;
                        const sold = option.buyer !== ZERO_ADDRESS;
                        const isWriter =
                            address?.toLowerCase() ===
                            option.writer.toLowerCase();
                        const reclaimed = option.lockedFunds === 0n;

                        return (
                            <div className="rounded border p-4 hover:shadow">
                                <p>
                                    <strong>Option ID:</strong> {index}
                                </p>
                                <p>
                                    <strong>Type:</strong>{" "}
                                    {option.optionType === 0 ? "CALL" : "PUT"}
                                </p>
                                <p>
                                    <strong>Writer:</strong> {option.writer}
                                </p>
                                <p>
                                    <strong>Strike Price:</strong>{" "}
                                    {option.strikePrice.toString()}
                                </p>
                                <p>
                                    <strong>Premium:</strong>{" "}
                                    {formatEther(option.premium)} ETH
                                </p>
                                <p>
                                    <strong>Expiration:</strong>{" "}
                                    {new Date(
                                        Number(option.expirationDate) * 1000,
                                    ).toLocaleString()}
                                </p>

                                {sold && <p className="mt-2">Already bought</p>}
                                {!sold && expired && (
                                    <>
                                        <p className="mt-2">Expired</p>
                                        {isWriter && !reclaimed && (
                                            <button
                                                className="mt-2 rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
                                                onClick={() =>
                                                    handleReclaim(BigInt(index))
                                                }
                                            >
                                                Reclaim{" "}
                                                {formatEther(
                                                    option.lockedFunds,
                                                )}{" "}
                                                ETH
                                            </button>
                                        )}
                                        {isWriter && reclaimed && (
                                            <p className="mt-2">
                                                Collateral reclaimed
                                            </p>
                                        )}
                                    </>
                                )}
                                {!sold && !expired && (
                                    <button
                                        className="mt-2 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                                        onClick={() =>
                                            handleBuyOption(
                                                BigInt(index),
                                                option.premium,
                                            )
                                        }
                                    >
                                        Buy for {formatEther(option.premium)}{" "}
                                        ETH
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

BuyOption.layout = {
    breadcrumbs: [
        {
            title: "Buy",
            href: "/buy-option",
        },
    ],
};
