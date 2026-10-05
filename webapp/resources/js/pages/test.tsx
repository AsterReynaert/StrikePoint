import { useEffect, useState } from "react";
import {
    createWalletClient,
    createPublicClient,
    custom,
    type Address,
} from "viem";
import { hardhat } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

const walletClient = createWalletClient({
    chain: hardhat,
    transport: custom(window.ethereum!),
});

const publicClient = createPublicClient({
    chain: hardhat,
    transport: custom(window.ethereum!),
});

function App() {
    const [address, setAddress] = useState<Address>();
    const [optionCount, setOptionCount] = useState<string>("Loading...");

    async function ConnectToWallet() {
        if (!window.ethereum) {
            alert("Please install MetaMask to use this feature.");
            return;
        }
        const [account] = await walletClient.requestAddresses();
        setAddress(account);
    }

    async function fetchOptionCount() {
        try {
            const data = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "optionCount",
            });
            setOptionCount(data.toString());
        } catch (error) {
            console.error(error);
            setOptionCount("Error: " + (error as Error).message);
        }
    }

    return (
        <div>
            <h1 className="text-center rounded-bl-2xl">Test</h1>
            
            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={ConnectToWallet}
            >
                Connect to Metamask
            </button>
            {<h1>Connected address: {address}</h1>}

            <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
                onClick={fetchOptionCount}
            >
                FetchNumberOfOptions
            </button>
            <p>optionCount: {optionCount}</p>
        </div>
    );
}

export default App;
