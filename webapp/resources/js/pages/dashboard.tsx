import { Head, Link } from "@inertiajs/react";
import { dashboard } from "@/routes";
import { useState, useEffect } from "react";
import { Address, createPublicClient, createWalletClient, custom } from "viem";
import { hardhat } from "viem/chains";
import Popup from "./popup";
import { Option } from "./test";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function InformationCard({
    option,
    type,
}: {
    option: Option;
    type: "buyer" | "writer";
}) {
    const expirationDate = Number(option.expirationDate) * 1000 < Date.now();
    const sold = option.buyer !== ZERO_ADDRESS;

    return (
        <div className="rounded border p-4 hover:shadow">
            <p>
                <strong>Type:</strong>
                {option.optionType === 0 ? " CALL" : " PUT"}
            </p>
            {type === "buyer" ? (
                <p>
                    <strong>Writer:</strong> {option.writer}
                </p>
            ) : (
                <p>
                    <strong>Buyer:</strong>{" "}
                    {sold ? option.buyer : "Not bought yet"}
                </p>
            )}
            <p>
                <strong>Strike Price:</strong> {option.strikePrice.toString()}
            </p>
            <p>
                <strong>Premium:</strong> {option.premium.toString()} wei
            </p>
            <p>
                <strong>Locked funds:</strong> {option.lockedFunds.toString()}{" "}
                wei
            </p>
            <p>
                <strong>Expiration:</strong>{" "}
                {new Date(
                    Number(option.expirationDate) * 1000,
                ).toLocaleString()}
            </p>
        </div>
    );
}

function Section({
    title,
    options,
    role,
    emptyText,
    actionText,
    actionHref,
}: {
    title: string;
    options: Option[];
    role: "buyer" | "writer";
    emptyText: String;
    actionText: string;
    actionHref: string;
}) {
    return (
        <section className="flex flex-col gap-3">
            <h1 className="text-xl font-semibold">{title}</h1>

            {options.length === 0 ? (
                <div className="flex max-w-md flex-col gap-2 rounded border p-4">
                    <p>{emptyText}</p>
                    <Link
                        href={actionHref}
                        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                    >
                        {actionText}
                    </Link>

                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {options.map((option) => (
                        <InformationCard option={option} type={role} />
                    ))}
                </div>
            )}
        </section>
    );
}

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

    return (
        <>
            <Head title="Dashboard" />

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
                />
                <Section
                    title="Options you wrote:"
                    options={writtenOptions}
                    role="writer"
                    emptyText="You haven't written any options yet."
                    actionText="Write an option"
                    actionHref="/write-option"
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
