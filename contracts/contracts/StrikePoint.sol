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

    modifier onlyOwner() {
        require(msg.sender == owner, "must be the owner");
        _;
    }
    
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
        Option storage option = options[_optionId];
        require(_optionId < optionCount, "Option does not exist");
        require(option.buyer == address(0), "Option already purchased");
        require(msg.value == option.premium, "Incorrect premium amount");
        require(block.timestamp < option.expirationDate, "Option has expired");

        option.buyer = payable(msg.sender);
        option.writer.transfer(msg.value); 
    
    }


}