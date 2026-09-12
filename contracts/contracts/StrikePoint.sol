// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol"; //import for real time eth price feed

contract StrikePoint {

    enum OptionType { CALL, PUT}

    struct Option{
        address payable writer; 
        address payable buyer; // is set when the option is purchased
        OptionType optionType;
        uint256 strikePrice; // fixed price at which the option owner can buy or sell the asset
        uint256 premium; // amount payed by the buyer to acquire the option
        uint256 expirationDate;
        uint256 lockedFunds; //amount of eth locked by the writer
        uint256 finalPrice; // price after setteling the contract
    }

    address public owner; 
    mapping(uint256 => Option) public options;
    uint256 public optionCount = 0; //to give a unique id to each option
    AggregatorV3Interface internal pricefeed;
    
    constructor(address _priceFeedAddress) {
        owner = msg.sender;
        pricefeed = AggregatorV3Interface(_priceFeedAddress); //e.g. Sepolia testnet ETH/USD price feed
    }

    function writeOption(OptionType _type, uint256 _strikePrice, uint256 _premium, uint256 _expirationDate) public payable {
        require(msg.value > 0, "must lock funds to write an option");
        require(_expirationDate > block.timestamp, "Expiration date must be in the future");

        Option memory newOption = Option({
            writer: payable(msg.sender),
            buyer: payable(address(0)),
            optionType: _type,
            strikePrice: _strikePrice,
            premium: _premium,
            expirationDate: _expirationDate,
            lockedFunds: msg.value,
            finalPrice: 0
        });

        options[optionCount] = newOption;
        optionCount++;
    }

    function buyOption(uint256 _optionId) public payable {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId];
        require(option.buyer == address(0), "Option already purchased");
        require(msg.value == option.premium, "Incorrect premium amount");
        require(block.timestamp < option.expirationDate, "Option has expired");

        option.buyer = payable(msg.sender); // set the buyer of the option
        (bool success, ) = option.writer.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

   function settlePrice(uint256 _optionId) public {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId]; 
        require(block.timestamp >= option.expirationDate, "Option has not expired yet");
        require(option.finalPrice == 0, "Already settled");

        (, int256 price, , , ) = pricefeed.latestRoundData();
        require(price > 0, "Invalid price from price feed");

        option.finalPrice = uint256(price);
   }

    function exerciseOption(uint256 _optionId) public {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId];

        require(option.buyer == msg.sender, "Only the buyer can exercise the option");
        require(option.finalPrice != 0, "settlement price not set yet");

        uint256 payoff;

        if(option.optionType == OptionType.CALL){
            payoff = option.finalPrice > option.strikePrice ? option.finalPrice - option.strikePrice : 0;
        }
        else { // PUT
            payoff = option.finalPrice < option.strikePrice ? option.strikePrice - option.finalPrice : 0; 
        }

        uint256 leftOver = option.lockedFunds - payoff;
        option.lockedFunds = 0;

        if(payoff > 0){
            (bool sentToBuyer, ) = option.buyer.call{value: payoff}("");
            require(sentToBuyer, "Payout to buyer failed");
        }

        if(leftOver > 0){
            (bool sentToWriter, ) = option.writer.call{value: leftOver}("");
            require(sentToWriter, "Refund to writer failed");
        }
    }
}