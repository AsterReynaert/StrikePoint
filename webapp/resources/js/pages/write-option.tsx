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

export default function WriteOption() {
    const [address, setAddress] = useState<Address>();
    const [connectError, setConnectError] = useState<string>("");
    const [optionType, setOptionType] = useState<number>(0);
    const [strikePrice, setStrikePrice] = useState<string>("");
    const [premium, setPremium] = useState<string>("");
    const [expiryHours, setExpiryHours] = useState<string>("");
    const [collateral, setCollateral] = useState<string>("");

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

    // Auto connect to wallet when page renders
    useEffect(() => {
        connectToWallet();
    }, []);

    async function handleWriteOption() {
        if (!window.ethereum) {
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

        const expiryTimestamp =
            BigInt(Math.floor(Date.now() / 1000)) +
            BigInt(expiryHours) * 3600n;

        const { request } = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "writeOption",
            args: [
                optionType,
                BigInt(strikePrice),
                BigInt(premium),
                expiryTimestamp,
            ],
            value: BigInt(collateral),
            account: address,
        });

        const hash = await walletClient.writeContract(request);         
    }

    return (
        <>
            <Head title="Write" />

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

                <form
                    className="flex max-w-sm flex-col gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleWriteOption();
                    }}
                >
                    <select
                        value={optionType}
                        onChange={(e) => setOptionType(Number(e.target.value))}
                    >
                        <option value={0}>CALL</option>
                        <option value={1}>PUT</option>
                    </select>

                    <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Strike Price"
                        value={strikePrice}
                        onChange={(e) => setStrikePrice(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Premium"
                        value={premium}
                        onChange={(e) => setPremium(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Expiry Hours"
                        value={expiryHours}
                        onChange={(e) => setExpiryHours(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Collateral"
                        value={collateral}
                        onChange={(e) => setCollateral(e.target.value)}
                        required
                    />

                    <button
                        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                        type="submit"
                    >
                        Write Option
                    </button>
                </form>
            </div>
        </>
    );
}

WriteOption.layout = {
    breadcrumbs: [
        {
            title: "Write",
            href: "/write-option",
        },
    ],
};
