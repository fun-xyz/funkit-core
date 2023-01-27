// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../lib/AA/BaseAccount.sol";
import "../lib/interfaces/IValidation.sol";
import "../lib/interfaces/IAction.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Treasury is BaseAccount {
    mapping(address => bool) private whitelist;
    mapping(string => bytes) private state;
    mapping(address => mapping(string => bool)) internalActions;

    function callOp(
        address addr,
        uint256 value,
        bytes calldata data
    ) public returns (bytes memory) {
        return _call(addr, value, data);
    }

    // state view and update function
    function getStateVal(string memory key) public view returns (bytes memory) {
        string memory subkey = string(
            abi.encodePacked(abi.encode(msg.sender, key))
        );
        return state[subkey];
    }

    function updateStateVal(string memory key, bytes memory data) public {
        string memory subkey = string(
            abi.encodePacked(abi.encode(msg.sender, key))
        );
        state[subkey] = data;
    }

    // Account Abstraction specific

    mapping(uint256 => bool) nonceMap;
    mapping(address => bool) allowedEOAsMap;
    mapping(address => mapping(address => bool)) actionToUserMap;

    using ECDSA for bytes32;

    //explicit sizes of nonce, to fit a single storage cell with "owner"
    uint96 private _nonce;
    address public owner;

    function nonce() public view override returns (uint256) {
        return 0;
    }

    function checkNonce(uint256 attempt) public view returns (bool) {
        return nonceMap[attempt];
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    IEntryPoint private _entryPoint;

    event EntryPointChanged(
        address indexed oldEntryPoint,
        address indexed newEntryPoint
    );

    // solhint-disable-next-line no-empty-blocks

    receive() external payable {}

    constructor(IEntryPoint anEntryPoint, address anOwner) {
        _entryPoint = anEntryPoint;
        owner = anOwner;
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the entryPoint (which gets redirected through execFromEntryPoint)
        require(
            msg.sender == owner || msg.sender == address(this),
            "only owner"
        );
    }

    function addAccessToUser(address user) public {
        _onlyOwner();
        allowedEOAsMap[user] = true;
    }

    function removeAccessFromUser(address user) public {
        _onlyOwner();
        allowedEOAsMap[user] = false;
    }

    function addActionToUser(address user, address actionAddress) public {
        _onlyOwner();
        actionToUserMap[user][actionAddress] = true;
    }

    function addAction(address actionAddress) public {
        whitelist[actionAddress] = true;
    }

    /**
     * transfer eth value to a destination address
     */

    function transfer(address dest, uint256 amount) external {
        payable(dest).transfer(amount);
    }

    /**
     * execute a transaction (called directly from owner, not by entryPoint)
     */
    function exec(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyOwner {
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transaction
     */

    function execBatch(address[] calldata dest, bytes[] calldata func)
        external
        onlyOwner
    {
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    /**
     * change entry-point:
     * an account must have a method for replacing the entryPoint, in case the the entryPoint is
     * upgraded to a newer version.
     */

    function _updateEntryPoint(address newEntryPoint) internal override {
        emit EntryPointChanged(address(_entryPoint), newEntryPoint);
        _entryPoint = IEntryPoint(payable(newEntryPoint));
    }

    function _requireFromAdmin() internal view override {
        _onlyOwner();
    }

    /**
     * validate the userOp is correct.
     * revert if it doesn't.
     * - must only be called from the entryPoint.
     * - make sure the signature is of our supported signer.
     * - validate current nonce matches request nonce, and increment it.
     * - pay prefund, in case current deposit is not enough
     */
    function _requireFromEntryPoint() internal view override {
        require(
            msg.sender == address(entryPoint()),
            "account: not from EntryPoint"
        );
    }

    // called by entryPoint, only after validateUserOp succeeded.
    function execFromEntryPoint(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        _requireFromEntryPoint();
        _call(dest, value, func);
    }

    /// implement template method of BaseAccount
    function _validateAndUpdateNonce(UserOperation calldata userOp)
        internal
        override
    {
        // require(!nonceMap[userOp.nonce], "account: invalid nonce");
        nonceMap[userOp.nonce] = true;
    }

    /// implement template method of BaseAccount
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        address
    ) internal virtual override returns (uint256 deadline) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        //ignore signature mismatch of from==ZERO_ADDRESS (for eth_callUserOp validation purposes)
        // solhint-disable-next-line avoid-tx-origin
        // address(0) == hash.recover(userOp.signature)
        require(
            owner == hash.recover(userOp.signature) || tx.origin == address(0),
            "account: wrong signature"
        );

        // _externalValidation(userOp.callData);

        return 0;
    }

    function _externalValidation(bytes memory op) internal view {
        (address actionAddress, bytes memory data) = abi.decode(
            op,
            (address, bytes)
        );
        address verificationAddress = IAction(actionAddress)
            .getVerificationContract(address(this));
        IValidation(verificationAddress).validate(data);
    }

    function _call(
        address target,
        uint256 value,
        bytes memory data
    ) internal returns (bytes memory) {
        (bool success, bytes memory result) = payable(target).call{
            value: value
        }(data);
        require(success, "External Call Failed");
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        return result;
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        (bool req, ) = address(entryPoint()).call{value: msg.value}("");
        require(req);
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount)
        public
        onlyOwner
    {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }
}
