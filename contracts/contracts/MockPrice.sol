// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.34;

contract MockPrice {
    int256 public price;

    function setPrice(int256 _price) public {
        price = _price;
    }

    function latestRoundData() public view returns (uint80 , int256 , uint256 , uint256 , uint80){
         return (0, price, 0, 0, 0);
    }
}