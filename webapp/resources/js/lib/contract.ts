export const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; //address to check if the option is sold or not

export const CONTRACT_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_optionId",
          "type": "uint256"
        }
      ],
      "name": "buyOption",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_optionId",
          "type": "uint256"
        }
      ],
      "name": "exerciseOption",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "optionCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "options",
      "outputs": [
        {
          "internalType": "address payable",
          "name": "writer",
          "type": "address"
        },
        {
          "internalType": "address payable",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "enum StrikePoint.OptionType",
          "name": "optionType",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "strikePrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "premium",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "expirationDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lockedFunds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "finalPrice",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_optionId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_price",
          "type": "uint256"
        }
      ],
      "name": "settlePrice",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum StrikePoint.OptionType",
          "name": "_type",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "_strikePrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_premium",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_expirationDate",
          "type": "uint256"
        }
      ],
      "name": "writeOption",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ] as const;
