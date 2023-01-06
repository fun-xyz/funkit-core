// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {AToken} from "@aave/core-v3/contracts/protocol/tokenization/AToken.sol";

contract AaveLiquadation is Action {
    mapping(string => bytes) public requests;

    function _init(
        address userAddr,
        address aTokenAddr,
        uint256 positionMax,
        string memory key,
        bytes memory data
    ) private {
        // require(AToken(aTokenAddr).allowance(userAddr, msg.sender) >= positionMax);
    }

    function init(bytes memory data)
        external
        payable
        override
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
        (
            address userAddr,
            address aTokenAddr,
            uint256 positionMax,
            string memory key
        ) = decode(data);

        storeData(msg.sender, key, data);

        // _init(userAddr, aTokenAddr, positionMax, key, data);
        return bytes("");
    }

    function decode(bytes memory data)
        internal
        pure
        returns (
            address userAddr,
            address aTokenAddr,
            uint256 positionMax,
            string memory key
        )
    {
        (userAddr, aTokenAddr, positionMax, key) = abi.decode(
            data,
            (address, address, uint256, string)
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
            uint256 positionMax,
            string memory throwaway
        ) = decode(externaldata);

        uint256 balance = AToken(aTokenAddr).balanceOf(userAddr);

        bytes memory actionData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            userAddr,
            msg.sender,
            balance
        );
        sendCallOp(msg.sender, aTokenAddr, actionData, 0);

        IPool pool = AToken(aTokenAddr).POOL();
        address assetAddr = AToken(aTokenAddr).UNDERLYING_ASSET_ADDRESS();

        // actionData = abi.encodeWithSignature(
        //     "withdraw(address,uint256,address)",
        //     assetAddr,
        //     balance,
        //     userAddr
        // );
        // sendCallOp(msg.sender, address(pool), actionData, 0);

        return bytes("");
    }
}
