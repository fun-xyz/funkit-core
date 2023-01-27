// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {AToken} from "@aave/core-v3/contracts/protocol/tokenization/AToken.sol";

contract AaveWithdraw is Action {
    mapping(string => address) public requests;

    function init(bytes memory data)
        public
        payable
        override
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
        (, , string memory key) = decode(data);
        storeData(msg.sender, key, data);
        return bytes("");
    }

    function decode(bytes memory data)
        internal
        pure
        returns (
            address userAddr,
            address aTokenAddr,
            string memory key
        )
    {
        (userAddr, aTokenAddr, key) = abi.decode(
            data,
            (address, address, string)
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
            address aTokenAddr,
            string memory throwaway
        ) = decode(externaldata);
        IPool pool = AToken(aTokenAddr).POOL();

        uint256 allowance = AToken(aTokenAddr).allowance(userAddr, msg.sender);
        uint256 userbalance = AToken(aTokenAddr).balanceOf(userAddr);
        uint256 position = allowance < userbalance ? allowance : userbalance;

        address assetAddr = AToken(aTokenAddr).UNDERLYING_ASSET_ADDRESS();

        bytes memory actionData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            userAddr,
            msg.sender,
            position
        );

        bytes memory resBytes = sendCallOp(
            msg.sender,
            aTokenAddr,
            0,
            actionData
        );

        bool res = abi.decode(resBytes, (bool));

        bytes memory withdrawdata = abi.encodeWithSignature(
            "withdraw(address,uint256,address)",
            assetAddr,
            position,
            userAddr
        );

        sendCallOp(msg.sender, address(pool), 0, withdrawdata);

        return bytes("");
    }
}
