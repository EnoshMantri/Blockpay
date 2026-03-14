// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ComplianceRegistry is Ownable {
    struct WalletData {
        bool whitelisted;
        bool blacklisted;
        uint256 limit;
    }

    mapping(address => WalletData) public registry;

    event Whitelisted(address indexed wallet, uint256 limit);
    event Blacklisted(address indexed wallet, string reason);
    event RemovedFromBlacklist(address indexed wallet);

    constructor() Ownable(msg.sender) {}

    function whitelist(address _wallet, uint256 _limit) external onlyOwner {
        require(!registry[_wallet].blacklisted, "Wallet is blacklisted");
        registry[_wallet] = WalletData({
            whitelisted: true,
            blacklisted: false,
            limit: _limit
        });
        emit Whitelisted(_wallet, _limit);
    }

    function blacklist(address _wallet, string calldata _reason) external onlyOwner {
        registry[_wallet].blacklisted = true;
        registry[_wallet].whitelisted = false;
        emit Blacklisted(_wallet, _reason);
    }

    function removeBlacklist(address _wallet) external onlyOwner {
        registry[_wallet].blacklisted = false;
        emit RemovedFromBlacklist(_wallet);
    }

    function bulkWhitelist(address[] calldata _wallets) external onlyOwner {
        for (uint i = 0; i < _wallets.length; i++) {
            if (!registry[_wallets[i]].blacklisted) {
                registry[_wallets[i]].whitelisted = true;
                registry[_wallets[i]].limit = 500 * (10 ** 6); // Default 500 limit
            }
        }
    }

    function canTransfer(address _sender, address _receiver, uint256 _amount) external view returns (bool) {
        if (!registry[_sender].whitelisted || registry[_sender].blacklisted) return false;
        if (!registry[_receiver].whitelisted || registry[_receiver].blacklisted) return false;
        if (registry[_sender].limit > 0 && _amount > registry[_sender].limit) return false;
        return true;
    }
}
