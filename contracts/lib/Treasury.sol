// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract Treasury {
    mapping(address => bool) private whitelist;
    mapping(string => bytes) private state;

    function main() public {}

    function callOp(
        address addr,
        uint256 value,
        bytes calldata data
    ) public returns (bytes memory) {
        return _call(addr, value, data);
    }

    // internal delegate call from EIP-4337
    function _call(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        return result;
    }

    // state view and update function
    function getStateVal(string calldata key)
        public
        view
        returns (bytes memory)
    {
        return state[key];
    }

    function updateStateVal(string calldata key, bytes memory data) public {
        state[key] = data;
    }
}
