// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Action.sol";

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    function increaseLiquidity(IncreaseLiquidityParams calldata params)
        external
        payable
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1);
}


contract UniV3Close is Action {
    // function _init(
    //     uint256 tokenId,
    //     address positionManagerAddress,
    //     bytes calldata data,
    //     string memory key
    // ) internal {
    //     storeData(msg.sender, key, data);
    // }

    function execute(bytes calldata data)
        external
        payable
        override
        returns (bytes memory)
    {
        (
            uint256 tokenId,
            address positionManagerAddress,
            bytes memory sigInfo
        ) = decode(data);
        verifyPermitTransfer(sigInfo, positionManagerAddress);
        collectAllFees(tokenId, positionManagerAddress);
        return bytes("");
    }

    function decodeSig(bytes memory data)
        internal
        pure
        returns (
            address spender,
            uint256 tokenId,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        (spender, tokenId, deadline, v, r, s) = abi.decode(
            data,
            (address, uint256, uint256, uint8, bytes32, bytes32)
        );
    }

    function decode(bytes calldata data)
        internal
        pure
        returns (
            uint256 tokenId,
            address positionManagerAddress,
            bytes memory sigInfo
        )
    {
        (tokenId, positionManagerAddress, sigInfo) = abi.decode(
            data,
            (uint256, address, bytes)
        );
    }

    function verifyPermitTransfer(
        bytes memory sigInfo,
        address positionManagerAddress
    ) private {
        (
            address spender,
            uint256 tokenId,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        ) = decodeSig(sigInfo);
        bytes memory data = abi.encodeWithSignature(
            "permit(address,uint256,uint256,uint8,bytes32,bytes32)",
            spender,
            tokenId,
            deadline,
            v,
            r,
            s
        );
        sendCallOp(msg.sender, positionManagerAddress, data, 0);
    }

    function collectAllFees(uint256 tokenId, address positionManagerAddress)
        internal
        returns (uint256 amount0, uint256 amount1)
    {
        INonfungiblePositionManager nonfungiblePositionManager = INonfungiblePositionManager(
                positionManagerAddress
            );
        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);
        bytes memory data = abi.encodeWithSignature(
            "collect((uint256,address,uint128,uint128))",
            params
        );
        sendCallOp(msg.sender, positionManagerAddress, data, 0);
    }
}
