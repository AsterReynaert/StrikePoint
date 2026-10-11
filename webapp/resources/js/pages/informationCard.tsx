import { Option } from "./option";
import { ZERO_ADDRESS } from "../lib/contract";

export function InformationCard({
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