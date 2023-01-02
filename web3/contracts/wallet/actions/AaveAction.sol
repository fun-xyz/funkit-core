// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {AToken} from "@aave/core-v3/contracts/protocol/tokenization/AToken.sol";

contract AaveLiquadation is Action {
    function _init(
        address userAddr,
        address aTokenAddr,
        uint256 positionMax,
        string memory key,
        bytes calldata data
    ) private {
        // verifyAccessToAToken(userAddr, aTokenAddr, positionMax, msg.sender);
        storeData(msg.sender, key, data);
    }

    function verifyAccessToAToken(
        address userAddr,
        address aTokenAddr,
        uint256 positionMax,
        address addr
    ) private view {
        if (positionMax < type(uint256).max) {
            require(
                AToken(aTokenAddr).allowance(userAddr, addr) >= positionMax
            );
        }
    }

    function init(bytes calldata data)
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
        _init(userAddr, aTokenAddr, positionMax, key, data);
        return bytes("");
    }

    function decode(bytes calldata data)
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

    function decodeMem(bytes memory memData)
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
            memData,
            (address, address, uint256, string)
        );
    }

    function execute(bytes calldata data)
        external
        payable
        override
        returns (bytes memory)
    {
        string memory key = abi.decode(data, (string));

        (
            address userAddr,
            address aTokenAddr,
            uint256 positionMax,
            string memory throwaway
        ) = decodeMem(getData(msg.sender, key));

        verifyAccessToAToken(userAddr, aTokenAddr, positionMax, msg.sender);

        uint256 balance = AToken(aTokenAddr).balanceOf(userAddr);

        bytes memory actionData = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            userAddr, msg.sender, balance
        );
        sendCallOp(msg.sender, aTokenAddr, actionData, 0);

        IPool pool = AToken(aTokenAddr).POOL();
        address assetAddr = AToken(aTokenAddr).UNDERLYING_ASSET_ADDRESS();

        pool.withdraw(assetAddr, balance, userAddr); //call op
        actionData = abi.encodeWithSignature(
            "withdraw(address,uint256,address)",
            assetAddr, balance, userAddr
        );
        sendCallOp(msg.sender, address(pool), actionData, 0);

        return bytes("");
    }
}
