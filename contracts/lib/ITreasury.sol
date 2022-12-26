// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface ITreasury {
    function main() external;

    function callOp(
        address addr,
        uint256 value,
        bytes calldata data
    ) external returns (bytes memory);

    function getStateVal(string calldata key)
        external
        view
        returns (bytes memory);

    function updateStateVal(string calldata key, bytes memory data) external;
}
