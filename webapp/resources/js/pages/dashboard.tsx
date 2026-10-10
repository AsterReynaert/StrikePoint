import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { useState, useEffect } from 'react';
import {
    createWalletClient,
    custom,
} from "viem";
import { hardhat } from "viem/chains";


export default function Dashboard() {
    const [address, setAddress] = useState();
    const [error, setError] = useState<String>("");

    async function connectToWallet() {
        if (!window.ethereum) {
            setError('MetaMask is not installed. Please install it to use StrikePoint.');
            return;
        }

        try {
            const walletClient = createWalletClient({
                chain: hardhat,
                transport: custom(window.ethereum),
            });
            const [account] = await walletClient.requestAddresses();
            setAddress(account);
        } catch (e) {
            setError('Connection failed: ' + (e as Error).message);
        }
    }

    //Auto connect to wallet when page renders
    useEffect(() => {
        connectToWallet();
    }, []);

    let metamaskConnectionSection;

    if (address) {
        metamaskConnectionSection = <p>Connected wallet address: {address}</p>;
    } else {
        metamaskConnectionSection = (
            <button
                className="w-fit rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                onClick={connectToWallet}
            >
                Connect to MetaMask
            </button>
        );
    }

    return (
        <>
            <Head title="StrikePoint Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {metamaskConnectionSection}
                {error && <p className="text-red-500">{error}</p>}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {   
            title: 'StrikePoint',
            href: dashboard(),
        },
    ],
};
