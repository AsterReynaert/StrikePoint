import { Head } from "@inertiajs/react";
import { useEffect, useState } from "react";
import {
    createWalletClient,
    createPublicClient,
    custom,
    type Address,
} from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import Popup from "./popup";

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

        await walletClient.writeContract(request);
        fetchOptions();
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

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {address && <p>Connected: {address}</p>}
                {options.length === 0 && <p>No options available</p>}
                <div className="flex flex-col gap-4">
                    {options.map((option, index) => { 
                        const expired = Number(option.expirationDate) * 1000 < Date.now();                            
                        const sold = option.buyer !== ZERO_ADDRESS;

                        return (
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
                                    <strong>Strike Price:</strong>{" "}
                                    {option.strikePrice.toString()}
                                </p>
                                <p>
                                    <strong>Premium:</strong>{" "}
                                    {option.premium.toString()}
                                </p>
                                <p>
                                    <strong>Expiration:</strong>{" "}
                                    {new Date(
                                        Number(option.expirationDate) * 1000,
                                    ).toLocaleString()}
                                </p>

                                {sold && <p className="mt-2">Already bought</p>}
                                {!sold && expired && (
                                    <p className="mt-2">Expired</p>
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
                                        Buy for {option.premium.toString()} wei
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
