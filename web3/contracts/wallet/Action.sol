// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Treasury.sol";

abstract contract Action {
    mapping(address => bool) internal whitelist;

    function getVerificationContract(address user) public view virtual {}

    function storeData(
        address treasury,
        string memory key,
        bytes memory data
    ) internal {
        string memory subkey = string(
            abi.encodePacked(abi.encode(address(this), key))
        );
        Treasury(payable(treasury)).updateStateVal(subkey, data);

        // bytes memory sdata = abi.encodeWithSignature(
        //     "updateStateVal(string,bytes)",
        //     subkey,
        //     data
        // );
        // (bool success, ) = treasury.call(sdata);
        // require(success);
    }

    function getData(address treasury, string memory key)
        public
        view
        returns (bytes memory)
    {
        string memory subkey = string(
            abi.encodePacked(abi.encode(address(this), key))
        );
        return Treasury(payable(treasury)).getStateVal(subkey);
        // bytes memory sdata = abi.encodeWithSignature(
        //     "getStateVal(string)",
        //     subkey
        // );
        // (bool success, bytes memory res) = treasury.staticcall(sdata);
        // require(success);
        // return res;
    }

    function sendCallOp(
        address treasury,
        address location,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return Treasury(payable(treasury)).callOp(location, value, data);
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

    function init() external payable virtual returns (bytes memory) {
        whitelist[msg.sender] = true;
        return bytes("");
    }

    function init(bytes memory data)
        external
        payable
        virtual
        returns (bytes memory)
    {
        whitelist[msg.sender] = true;
        return bytes("");
    }

    function execute(bytes memory data)
        external
        payable
        virtual
        returns (bytes memory)
    {}
}
