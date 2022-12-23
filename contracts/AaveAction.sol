// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./lib/Action.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // solhint-disable-line
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

contract AaveLiquadation is Action {
    mapping(address => bool) private whitelist;

    function _init(
        address poolAddr,
        address aTokenAddr,
        uint256 positionMax
    ) private {}

    function init(bytes calldata data)
        external
        payable
        override
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
    }

    function execute(ActionRequest calldata request)
        external
        payable
        override
        returns (bytes memory)
    {}
}
