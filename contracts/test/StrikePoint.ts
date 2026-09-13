import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

describe("StrikePoint", async function () {
    const { viem } = await network.create();
    const publicClient = await viem.getPublicClient();
    const CALL = 0;
    const PUT = 1;


    async function deployStrikePoint() {
        const mockPrice = await viem.deployContract("MockPrice")
        const strikePoint = await viem.deployContract("StrikePoint", [mockPrice.address]);
        return {mockPrice, strikePoint};
    }

    async function futurExperationDate(){
        const block = await publicClient.getBlock();
        const futurDate = block.timestamp + 10000000n;
        return futurDate;
    }

    // Write Option Tests 

      it("Should store a new option with the correct values", async function () {
        const {mockPrice, strikePoint} = await deployStrikePoint();
        const [writer] = await viem.getWalletClients();
        const expiry = await futurExperationDate();

        await strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 1000n,
            }
        );

        const option = await strikePoint.read.options([0n]);
        assert.equal(option[0], getAddress(writer.account.address)); // writer
        assert.equal(option[1], "0x0000000000000000000000000000000000000000"); // buyer 
        assert.equal(option[2], CALL); // optionType
        assert.equal(option[3], 2000n); // strikePrice
        assert.equal(option[4], 20n); // premium
        assert.equal(option[5], expiry); // expirationDate
        assert.equal(option[6], 1000n); // lockedFunds
        assert.equal(option[7], 0n); // finalPrice
    });

    it("Should revert when writing an option with no locked funds", async function () {
        const {mockPrice, strikePoint} = await deployStrikePoint();
        const [writer] = await viem.getWalletClients();
        const expiry = await futurExperationDate();

        await assert.rejects(
            strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 0n,
            }
        ), 
        /revert/ //makes sure that the rejection is due to a revert 
    );
    });

    it("Should revert when writing an option with an expiration date in the past", async function () {
        const {mockPrice, strikePoint} = await deployStrikePoint();
        const [writer] = await viem.getWalletClients();
        const expiry = 0n; // past date

        await assert.rejects(
            strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 1000n,
            }
        ), 
        /revert/ //makes sure that the rejection is due to a revert 
    );
    });

    // Buy Option Tests

    it("Should let a buyer purchase an option and let the buyer pay the premium", async function () {
        const {mockPrice, strikePoint} = await deployStrikePoint();
        const [writer, buyer] = await viem.getWalletClients();
        const expiry = await futurExperationDate();

        await strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 1000n,
            }
        );

        const writerBalanceBefore = await publicClient.getBalance({ address: writer.account.address });
        const buyerBalanceBefore = await publicClient.getBalance({ address: buyer.account.address });

        const hash = await strikePoint.write.buyOption(
            [0n], //optionId
            { 
                account: buyer.account, 
                value: 20n,
            }
        );

        const receipt = await publicClient.getTransactionReceipt({ hash });
        const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

        const writerBalanceAfter = await publicClient.getBalance({ address: writer.account.address });
        const buyerBalanceAfter = await publicClient.getBalance({ address: buyer.account.address });

        assert.equal(writerBalanceAfter, writerBalanceBefore + 20n); // writer should receive the premium
        assert.equal(buyerBalanceAfter, buyerBalanceBefore - (20n + gasCost)); // buyer should pay the premium
    });

    it("Should revert when the premium is incorrect", async function () {
        const {mockPrice, strikePoint} = await deployStrikePoint();
        const [writer, buyer] = await viem.getWalletClients();
        const expiry = await futurExperationDate();
        
        await strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 1000n,
            }
        );

        await assert.rejects(
          strikePoint.write.buyOption(
            [0n], 
            {
              account: buyer.account,
              value: 10n, // incorrect premium!
            },
          ),
          /revert/,
        );
    });

    it("Should revert when trying to buy an option that is already bought by someone else", async function () {
        const { mockPrice, strikePoint } = await deployStrikePoint();
        const [writer, buyerOne, buyerTwo] = await viem.getWalletClients();
        const expiry = await futurExperationDate();

        await strikePoint.write.writeOption(
            [CALL, 2000n, 20n, expiry],
            { 
                account: writer.account, 
                value: 1000n,
            }
        );

        await strikePoint.write.buyOption(
            [0n], 
            { 
                account: buyerOne.account, 
                value: 20n,
            }
        );

        await assert.rejects(
          strikePoint.write.buyOption(
            [0n], 
            {
              account: buyerTwo.account,
              value: 20n, 
            },
          ),
          /revert/,
        );
    });

    it("Should revert when trying to buy an option that doesn't exist", async function () {
        const { mockPrice, strikePoint } = await deployStrikePoint();
        const [buyer] = await viem.getWalletClients();
        
        await assert.rejects(
            strikePoint.write.buyOption(
                [99n], // option id that doesn't exist
                { 
                    account: buyer.account,
                    value: 20n,
                }
            ),
            /revert/,
        );
    });
});