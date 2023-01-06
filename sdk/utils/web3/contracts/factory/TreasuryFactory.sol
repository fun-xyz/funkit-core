// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";
import "../wallet/Treasury.sol";
import "../lib/interfaces/IEntryPoint.sol";

contract TreasuryFactory {
    /**
     * create an account, and return its address.
     * returns the address even if the account is already deployed.
     * Note that during UserOperation execution, this method is called only if the account is not deployed.
     * This method returns an existing account address so that entryPoint.getSenderAddress() would work even after account creation
     */
    function createAccount(
        IEntryPoint entryPoint,
        address owner,
        uint256 salt
    ) public returns (Treasury ret) {
        address addr = getAddress(entryPoint, owner, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return Treasury(payable(addr));
        }
        ret = new Treasury{salt: bytes32(salt)}(entryPoint, owner);
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     */
    function getAddress(
        IEntryPoint entryPoint,
        address owner,
        uint256 salt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(Treasury).creationCode,
                        abi.encode(entryPoint, owner)
                    )
                )
            );
    }
}
