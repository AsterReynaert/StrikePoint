// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

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
    
    constructor() {
        owner = msg.sender;
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

   function settlePrice(uint256 _optionId, uint256 _price) public {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId]; 
        require(option.buyer != address(0), "Option has not been bought yet");
        require(block.timestamp >= option.expirationDate, "Option has not expired yet");
        require(option.finalPrice == 0, "Already settled");

        option.finalPrice = uint256(_price);
   }

    function exerciseOption(uint256 _optionId) public {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId];

        require(option.buyer == msg.sender, "Only the buyer can exercise the option");
        require(option.finalPrice != 0, "settlement price not set yet");
        require(option.lockedFunds > 0, "Already exercised");

        uint256 diff;


        if (option.optionType == OptionType.CALL) {
            diff = option.finalPrice > option.strikePrice ? option.finalPrice - option.strikePrice : 0;
        } else { // PUT
            diff = option.finalPrice < option.strikePrice ? option.strikePrice - option.finalPrice : 0;
        }

        uint256 payoff = (option.lockedFunds * diff) / option.finalPrice; //wei * (diff in $ per 1 eth) / price of 1 eth ($ per eth)  => devide by price of 1 eth to get the amount in wei
        if (payoff > option.lockedFunds) payoff = option.lockedFunds; //cap the payoff to the locked funds
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

    function reclaimFunds(uint256 _optionId) public {
        require(_optionId < optionCount, "Option does not exist");
        Option storage option = options[_optionId];

        require(msg.sender == option.writer, "Only the writer can reclaim");
        require(option.buyer == address(0), "Option was bought");
        require(block.timestamp >= option.expirationDate, "Option has not expired yet");
        require(option.lockedFunds > 0, "Nothing to reclaim");

        uint256 amount = option.lockedFunds;
        option.lockedFunds = 0;

        (bool success, ) = option.writer.call{value: amount}("");
        require(success, "Refund failed");
    }
        
    

}