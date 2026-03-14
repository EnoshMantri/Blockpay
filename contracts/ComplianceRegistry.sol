// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ComplianceRegistry
 * @notice On-chain compliance enforcement for BlockPay
 * @dev Manages whitelist, blacklist, and per-wallet transfer limits
 */
contract ComplianceRegistry is Ownable {
    struct WalletCompliance {
        bool whitelisted;
        bool blacklisted;
        uint256 transferLimit; // in token units (6 decimals)
    }

    mapping(address => WalletCompliance) private _registry;
    uint256 public defaultLimit; // default 500 USDC = 500_000_000 (6 decimals)

    event WalletWhitelisted(address indexed wallet, uint256 limit);
    event WalletBlacklisted(address indexed wallet);
    event WalletRemovedFromBlacklist(address indexed wallet);
    event TransferLimitUpdated(address indexed wallet, uint256 newLimit);

    constructor(uint256 _defaultLimit) Ownable(msg.sender) {
        defaultLimit = _defaultLimit;
    }

    /**
     * @notice Whitelist a wallet and set its transfer limit
     * @param wallet Address to whitelist
     * @param limit Per-transaction transfer limit (0 = use default)
     */
    function whitelistWallet(address wallet, uint256 limit) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(!_registry[wallet].blacklisted, "Cannot whitelist blacklisted wallet");
        _registry[wallet].whitelisted = true;
        _registry[wallet].transferLimit = limit > 0 ? limit : defaultLimit;
        emit WalletWhitelisted(wallet, _registry[wallet].transferLimit);
    }

    /**
     * @notice Blacklist a wallet (atomically revokes whitelist status)
     * @param wallet Address to blacklist
     */
    function blacklistWallet(address wallet) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        _registry[wallet].blacklisted = true;
        _registry[wallet].whitelisted = false;
        emit WalletBlacklisted(wallet);
    }

    /**
     * @notice Remove wallet from blacklist
     * @param wallet Address to remove from blacklist
     */
    function removeFromBlacklist(address wallet) external onlyOwner {
        require(_registry[wallet].blacklisted, "Not blacklisted");
        _registry[wallet].blacklisted = false;
        emit WalletRemovedFromBlacklist(wallet);
    }

    /**
     * @notice Update per-wallet transfer limit
     * @param wallet Target wallet
     * @param newLimit New limit in token units
     */
    function setTransferLimit(address wallet, uint256 newLimit) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(newLimit > 0, "Limit must be positive");
        _registry[wallet].transferLimit = newLimit;
        emit TransferLimitUpdated(wallet, newLimit);
    }

    function isWhitelisted(address wallet) external view returns (bool) {
        return _registry[wallet].whitelisted;
    }

    function isBlacklisted(address wallet) external view returns (bool) {
        return _registry[wallet].blacklisted;
    }

    function getLimit(address wallet) external view returns (uint256) {
        uint256 limit = _registry[wallet].transferLimit;
        return limit > 0 ? limit : defaultLimit;
    }

    function getWalletStatus(address wallet) external view returns (
        bool whitelisted,
        bool blacklisted,
        uint256 transferLimit
    ) {
        WalletCompliance memory c = _registry[wallet];
        return (c.whitelisted, c.blacklisted, c.transferLimit > 0 ? c.transferLimit : defaultLimit);
    }
}
