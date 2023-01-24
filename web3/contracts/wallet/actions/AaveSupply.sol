// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AaveSupply is Action {
    mapping(string => address) public requests;

    function init(bytes memory data)
        public
        payable
        override
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
        (, , , , string memory key) = decode(data);
        storeData(msg.sender, key, data);
        return bytes("");
    }

    function decode(bytes memory data)
        internal
        pure
        returns (
            address userAddr,
            address poolAddr,
            address tokenAddr,
            uint256 amount,
            string memory key
        )
    {
        (userAddr, poolAddr, tokenAddr, amount, key) = abi.decode(
            data,
            (address, address, address, uint256, string)
        );
    }

    function execute(bytes memory data)
        public
        payable
        override
        returns (bytes memory)
    {
        string memory key = abi.decode(data, (string));
        bytes memory externaldata = getData(msg.sender, key);

        (
            address userAddr,
            address poolAddr,
            address tokenAddr,
            uint256 amount,
            string memory throwaway
        ) = decode(externaldata);

        uint256 userbalance = ERC20(tokenAddr).balanceOf(userAddr);
        uint256 position = amount < userbalance ? amount : userbalance;

        bytes memory actionData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            userAddr,
            msg.sender,
            position
        );

        bytes memory resBytes = sendCallOp(
            msg.sender,
            tokenAddr,
            0,
            actionData
        );

        bool res = abi.decode(resBytes, (bool));

        bytes memory supplydata = abi.encodeWithSignature(
            "supply(address,uint256,address,uint16)",
            tokenAddr,
            position,
            userAddr,
            0
        );

        sendCallOp(msg.sender, poolAddr, 0, supplydata);

        return bytes("");
    }
}
