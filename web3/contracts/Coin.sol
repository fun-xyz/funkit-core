// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Coin is ERC20 {
    constructor(string memory name_, string memory symbol_) {}

    function mint(address addr, uint256 amt) public {
        _mint(addr, amt);
    }
}
