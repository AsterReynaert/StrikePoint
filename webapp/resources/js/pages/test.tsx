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
    const [writeStatus, setWriteStatus] = useState<string>();

    const [optionType, setOptionType] = useState<number>(0);
    const [strikePrice, setStrikePrice] = useState<bigint>(0n);
    const [premium, setPremium] = useState<bigint>(0n);
    const [expiryHours, setExpiryHours] = useState<bigint>(1n);
    const [collateral, setCollateral] = useState<bigint>(0n);
    const [optionId, setOptionId] = useState<bigint>(-1n);
    const [optionPrice, setOptionPrice] = useState<bigint>(0n);

    const [options, setOptions] = useState<Option[]>([]);
    const [id, setId] = useState<any>();

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
            return data;
        } catch (error) {
            console.error(error);
            setOptionCount("Error: " + (error as Error).message);
        }
    }

    async function handleWriteOption() {
        if (!address) {
            alert("Connect your wallet first.");
            return;
        }

        try {
            const expiryTimestamp =
                BigInt(Math.floor(Date.now() / 1000)) + expiryHours * 3600n;

            const { request } = await publicClient.simulateContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "writeOption",
                args: [optionType, strikePrice, premium, expiryTimestamp],
                value: collateral,
                account: address,
            });

            const hash = await walletClient.writeContract(request);

            setWriteStatus("Option written: " + hash);
            fetchOptionCount();
        } catch (error) {
            console.error(error);
            setWriteStatus("Failed: " + (error as Error).message);
        }
    }

    async function handleBuyOption() {
        if (!address) {
            alert("Please connect with metamask first");
            return;
        }

        try {
            const { request } = await publicClient.simulateContract({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "buyOption",
                args: [optionId],
                value: optionPrice,
                account: address,
            });

            const hash = await walletClient.writeContract(request);
        } catch (error) {
            console.error(error);
            setWriteStatus("Failed: " + (error as Error).message);
        }
    }

    async function readOption(i: bigint) {
        const data = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "options",
            args: [i],
        });

        const [
            writer,
            buyer,
            optionType,
            strikePrice,
            premium,
            expirationDate,
            lockedFunds,
            finalPrice,
        ] = data;

        return {
            writer,
            buyer,
            optionType: optionType as OptionType,
            strikePrice,
            premium,
            expirationDate,
            lockedFunds,
            finalPrice,
        };
    }

    async function fetchAllOptions() {
     
        const count = await fetchOptionCount();

        if (count === undefined) {
            return;
        }

        const optionPromises: Promise<Option>[] = [];
        
        for (let i = 0n; i < count; i++) {
            optionPromises.push(readOption(i));
        }

        const optionArray = await Promise.all(optionPromises);


        setOptions(optionArray); 
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

            <div className="flex flex-col items-center m4">
                <select
                    value={optionType}
                    onChange={(e) => setOptionType(Number(e.target.value))}
                >
                    <option value={0}>CALL</option>
                    <option value={1}>PUT</option>
                </select>

                <form
                    className="flex flex-col gap-2 required
                "
                    onSubmit={(e) => {
                        e.preventDefault(); // dont reload the page
                        handleWriteOption();
                    }}
                >
                    <input
                        type="number"
                        placeholder="Strike Price"
                        onChange={(e) => setStrikePrice(BigInt(e.target.value))}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Premium"
                        onChange={(e) => setPremium(BigInt(e.target.value))}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Expiry Hours"
                        onChange={(e) => setExpiryHours(BigInt(e.target.value))}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Collateral"
                        onChange={(e) => setCollateral(BigInt(e.target.value))}
                        required
                    />
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
                        type="submit"
                    >
                        Write Option
                    </button>
                </form>
                <p>{writeStatus}</p>
            </div>

            

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Available Options</h2>

                <button
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    onClick={fetchAllOptions}
                >
                    Fetch All Options
                </button>

                <div className="mt-4 flex flex-col gap-4">
                    {options.map((option, index) => (
                        <div
                            className="border rounded p-4 hover:shadow   "
                        >
                            <p>
                                <strong>Option ID:</strong> {index}
                            </p>

                            <p>
                                <strong>Type:</strong>{" "}
                                {option.optionType === OptionType.CALL
                                    ? "CALL"
                                    : "PUT"}
                            </p>

                            <p>
                                <strong>Writer:</strong> {option.writer}
                            </p>

                            <p>
                                <strong>Buyer:</strong> {option.buyer}
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

                            <p>
                                <strong>Locked Funds:</strong>{" "}
                                {option.lockedFunds.toString()}
                            </p>

                            <p>
                                <strong>Final Price:</strong>{" "}
                                {option.finalPrice.toString()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
