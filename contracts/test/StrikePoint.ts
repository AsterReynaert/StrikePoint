import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

describe("StrikePoint", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();
  const CALL = 0;
  const PUT = 1;

  async function deployStrikePoint() {
  const strikePoint = await viem.deployContract("StrikePoint");
  return { strikePoint };
}

  async function futurExperationDate() {
    const block = await publicClient.getBlock();
    const futurDate = block.timestamp + 10000000n;
    return futurDate;
  }

  // Write Option Tests

  it("Should store a new option with the correct values", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

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
    const { strikePoint } = await deployStrikePoint();
    const [writer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await assert.rejects(
      strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
        account: writer.account,
        value: 0n,
      }),
      /revert/, //makes sure that the rejection is due to a revert
    );
  });

  it("Should revert when writing an option with an expiration date in the past", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer] = await viem.getWalletClients();
    const expiry = 0n; // past date

    await assert.rejects(
      strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
        account: writer.account,
        value: 1000n,
      }),
      /revert/, //makes sure that the rejection is due to a revert
    );
  });

  // Buy Option Tests

  it("Should let a buyer purchase an option and let the buyer pay the premium", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    const writerBalanceBefore = await publicClient.getBalance({
      address: writer.account.address,
    });
    const buyerBalanceBefore = await publicClient.getBalance({
      address: buyer.account.address,
    });

    const hash = await strikePoint.write.buyOption(
      [0n], //optionId
      {
        account: buyer.account,
        value: 20n,
      },
    );

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    const writerBalanceAfter = await publicClient.getBalance({
      address: writer.account.address,
    });
    const buyerBalanceAfter = await publicClient.getBalance({
      address: buyer.account.address,
    });

    assert.equal(writerBalanceAfter, writerBalanceBefore + 20n); // writer should receive the premium
    assert.equal(buyerBalanceAfter, buyerBalanceBefore - (20n + gasCost)); // buyer should pay the premium
  });

  it("Should revert when the premium is incorrect", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await assert.rejects(
      strikePoint.write.buyOption([0n], {
        account: buyer.account,
        value: 10n, // incorrect premium!
      }),
      /revert/,
    );
  });

  it("Should revert when trying to buy an option that is already bought by someone else", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyerOne, buyerTwo] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyerOne.account,
      value: 20n,
    });

    await assert.rejects(
      strikePoint.write.buyOption([0n], {
        account: buyerTwo.account,
        value: 20n,
      }),
      /revert/,
    );
  });

  it("Should revert when trying to buy an option that doesn't exist", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [buyer] = await viem.getWalletClients();

    await assert.rejects(
      strikePoint.write.buyOption(
        [99n], // option id that doesn't exist
        {
          account: buyer.account,
          value: 20n,
        },
      ),
      /revert/,
    );
  });

  // settlePrice Tests

  it("Should revert when trying to settle an option that hasn't expired yet", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });

    await assert.rejects(
      strikePoint.write.settlePrice([0n, 2100n], {
        account: writer.account,
      }),
      /revert/,
    );
  });

  it("should revert when trying to settle an option that has not been bought yet", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await assert.rejects(
      strikePoint.write.settlePrice([0n, 2100n], {
        account: writer.account,
      }),
      /revert/,
    );
  });

  it("Should correctly set finalPrice from the mock price feed after expiry", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });

    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 2100n], {
      account: writer.account,
    });

    const option = await strikePoint.read.options([0n]);
    assert.equal(option[7], 2100n); // finalPrice should be set to the mock price
  });

  it("should revert when trying to settle an option that has already been settled", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();


    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });

    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 2100n], {
      account: writer.account,
    });

    await assert.rejects(
      strikePoint.write.settlePrice([0n, 2100n], {
        account: writer.account,
      }),
      /revert/,
    );
  });

  //exerciseOption

  it("Should pay the buyer the correct payoff when exersising a in the money call option", async function () {
    //(in the money call option is when the final price is greater than the strike price)
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();
     

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });

    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 2100n], { // final price is greater than strike price, so the call option is in the money
      account: writer.account,
    });

    const buyerBalanceBefore = await publicClient.getBalance({
      address: buyer.account.address,
    });

    const hash = await strikePoint.write.exerciseOption([0n], {
      account: buyer.account,
    });

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    const buyerBalanceAfter = await publicClient.getBalance({
      address: buyer.account.address,
    });

    const expectedPayoff = (1000n * (2100n - 2000n)) / 2100n;
    assert.equal(
      buyerBalanceAfter,
      buyerBalanceBefore + expectedPayoff - gasCost,
    );
  });

  it("Should pay nothing to the buyer and return full collateral to writer for an out-of-the-money call option", async function () {
    //(out of the money call option is when the final price is less than the strike price
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([CALL, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });

    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 1900n], {// final price is less than strike price
      account: writer.account,
    });

    const buyerBalanceBefore = await publicClient.getBalance({
      address: buyer.account.address,
    });
    const writerBalanceBefore = await publicClient.getBalance({
      address: writer.account.address,
    });

    const hash = await strikePoint.write.exerciseOption([0n], {
      account: buyer.account,
    });

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    const buyerBalanceAfter = await publicClient.getBalance({
      address: buyer.account.address,
    });
    const writerBalanceAfter = await publicClient.getBalance({
      address: writer.account.address,
    });

    assert.equal(buyerBalanceAfter, buyerBalanceBefore - gasCost); // buyer should not receive any payoff but should pay gas fees
    assert.equal(writerBalanceAfter, writerBalanceBefore + 1000n);
  });

  it("Should pay the buyer the correct payoff for an in-the-money put option", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([PUT, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });
    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 1900n], {
      account: writer.account,
    });

    const buyerBalanceBefore = await publicClient.getBalance({
      address: buyer.account.address,
    });

    const hash = await strikePoint.write.exerciseOption([0n], {
      account: buyer.account,
    });

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    const buyerBalanceAfter = await publicClient.getBalance({
      address: buyer.account.address,
    });

    const expectedPayoff = (1000n * (2000n - 1900n)) / 1900n;
    assert.equal(
      buyerBalanceAfter,
      buyerBalanceBefore + expectedPayoff - gasCost,
    );
  });

  it("Should pay nothing to the buyer and return full locked funds to writer for an out-of-the-money put option", async function () {
    const { strikePoint } = await deployStrikePoint();
    const [writer, buyer] = await viem.getWalletClients();
    const expiry = await futurExperationDate();

    await strikePoint.write.writeOption([PUT, 2000n, 20n, expiry], {
      account: writer.account,
      value: 1000n,
    });

    await strikePoint.write.buyOption([0n], {
      account: buyer.account,
      value: 20n,
    });
    await testClient.increaseTime({
      seconds: 10000001,
    });

    await strikePoint.write.settlePrice([0n, 2100n], {
      account: writer.account,
    });

    const buyerBalanceBefore = await publicClient.getBalance({
      address: buyer.account.address,
    });
    const writerBalanceBefore = await publicClient.getBalance({
      address: writer.account.address,
    });

    const hash = await strikePoint.write.exerciseOption([0n], {
      account: buyer.account,
    });

    const receipt = await publicClient.getTransactionReceipt({ hash });
    const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

    const buyerBalanceAfter = await publicClient.getBalance({
      address: buyer.account.address,
    });
    const writerBalanceAfter = await publicClient.getBalance({
      address: writer.account.address,
    });

    assert.equal(buyerBalanceAfter, buyerBalanceBefore - gasCost);
    assert.equal(writerBalanceAfter, writerBalanceBefore + 1000n);
  });
});