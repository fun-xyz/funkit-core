// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/ITreasury.sol";

struct ActionRequest {
    bytes data;
}

// bytes memory callData = abi.encodeWithSignature(
//     "updateStateVal(string,bytes)",
//     key,
//     data
// );
// return _call(treasury, 0, callData);

abstract contract Action {
    function getVerificationContract(address user) public view virtual {}

    function storeData(
        address treasury,
        string memory key,
        bytes memory data
    ) internal {
        string memory subkey = string(abi.encodePacked(address(this), key));

        return ITreasury(treasury).updateStateVal(subkey, data);
    }

    function getData(address treasury, string memory key)
        internal
        view
        returns (bytes memory)
    {
        string memory subkey = string(abi.encodePacked(address(this), key));
        return ITreasury(treasury).getStateVal(subkey);
    }

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

    function init(bytes calldata data)
        external
        payable
        virtual
        returns (bytes memory)
    {}

    function execute(bytes calldata data)
        external
        payable
        virtual
        returns (bytes memory)
    {}
}
