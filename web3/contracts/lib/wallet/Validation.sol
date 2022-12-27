// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/ITreasury.sol";

abstract contract Validation {
    
    function validate(bytes calldata data) public view virtual {}

    function getData(address treasury, string memory key)
        internal
        view
        returns (bytes memory)
    {
        string memory subkey = string(abi.encodePacked(address(this), key));
        return ITreasury(treasury).getStateVal(subkey);
    }
}
