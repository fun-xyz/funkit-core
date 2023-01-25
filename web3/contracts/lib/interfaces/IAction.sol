// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAction {
    function getVerificationContract(address user)
        external
        view
        returns (address);

    function init(bytes calldata data) external payable returns (bytes memory);

    function execute(bytes calldata data)
        external
        payable
        returns (bytes memory);
}
