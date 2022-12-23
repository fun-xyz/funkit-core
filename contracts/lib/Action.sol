// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

struct ActionRequest {
    address location;
    bytes data;
    uint256 value;
}

abstract contract Action {
    function storeData(
        address treasury,
        string memory key,
        bytes memory data
    ) private {
        bytes memory callData = abi.encodeWithSignature(
            "updateStateVal(string,bytes)",
            key,
            data
        );
        return _call(treasury, 0, callData);
    }

    function init(bytes calldata data)
        external
        payable
        virtual
        returns (bytes memory)
    {}

    function execute(ActionRequest calldata request)
        external
        payable
        virtual
        returns (bytes memory)
    {}

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
}
