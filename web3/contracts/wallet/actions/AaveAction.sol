// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {AToken} from "@aave/core-v3/contracts/protocol/tokenization/AToken.sol";

contract AaveLiquadation is Action {
    mapping(string => uint256) public requests;

    function _init(
        address userAddr,
        address aTokenAddr,
        string memory key,
        bytes memory data
    ) private {
        // require(AToken(aTokenAddr).allowance(userAddr, msg.sender) >= positionMax);
    }

    function init(bytes memory data)
        public
        payable
        override
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
        (address userAddr, address aTokenAddr, string memory key) = decode(
            data
        );

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

        uint256 allowance = AToken(aTokenAddr).allowance(userAddr, msg.sender);
        uint256 userbalance = AToken(aTokenAddr).balanceOf(userAddr);
        uint256 positionSize = allowance < userbalance
            ? allowance
            : userbalance;
        if (positionSize > 0) {
            bytes memory actionData = abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                userAddr,
                msg.sender,
                positionSize
            );
            bytes memory resBytes = sendCallOp(
                msg.sender,
                aTokenAddr,
                0,
                actionData
            );

            // bool res = abi.decode(resBytes, (bool));
            IPool pool = AToken(aTokenAddr).POOL();
            address assetAddr = AToken(aTokenAddr).UNDERLYING_ASSET_ADDRESS();
            actionData = abi.encodeWithSignature(
                "withdraw(address,uint256,address)",
                assetAddr,
                positionSize,
                userAddr
            );
            sendCallOp(msg.sender, address(pool), 0, actionData);
        }
        return bytes("");
    }
}
