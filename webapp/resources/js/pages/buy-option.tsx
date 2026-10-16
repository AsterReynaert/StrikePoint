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
    formatUnits,
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
    collateral: bigint;
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

    // Auto connect + load options when page renders
    useEffect(() => {
        connectToWallet();
        fetchOptions();

        const testClient = createTestClient({
            //to setup auto mining
            chain: hardhat,
            mode: "hardhat",
            transport: http("http://127.0.0.1:8545"),
        });

        testClient.setIntervalMining({ interval: 1 }); //auto mine a block every second so the block.timestamp gets updated
        const refresh = setInterval(fetchOptions, 1000);
        return () => clearInterval(refresh);
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


    const available = options
        .map((option, index) => ({ option, index }))
        .filter(
            ({ option }) =>
                option.buyer === ZERO_ADDRESS && // not bought
                option.expirationDate > chainTime && // not expired
                option.writer.toLowerCase() !== address?.toLowerCase(), // not your own
        );

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
                {available.length === 0 && <p>No options available to buy</p>}
                <div className="flex flex-col gap-4">
                    {available.map(({ option, index }) => (
                        <div
                            className="rounded border p-4 hover:shadow"
                        >
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
                                <strong>Strike Price:</strong> $
                                {formatUnits(option.strikePrice, 2)}
                            </p>
                            <p>
                                <strong>Size:</strong>{" "}
                                {formatEther(option.collateral)} ETH
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

                            <button
                                className="mt-2 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                                onClick={() =>
                                    handleBuyOption(
                                        BigInt(index),
                                        option.premium,
                                    )
                                }
                            >
                                Buy for {formatEther(option.premium)} ETH
                            </button>
                        </div>
                    ))}
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