// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockStablecoin
 * @notice ERC-20 stablecoin pegged to USD for BlockPay remittance framework
 * @dev Owner-controlled mint/burn simulating fiat on/off-ramp operations
 */
contract MockStablecoin is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6; // USDC-style 6 decimals

    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);

    constructor() ERC20("BlockPay USD", "BPUSD") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Mint stablecoins to an address (simulates fiat on-ramp)
     * @param to Recipient wallet address
     * @param amount Amount in token units (6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /**
     * @notice Burn stablecoins from an address (simulates fiat off-ramp)
     * @param from Wallet to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Invalid address");
        require(amount > 0, "Amount must be positive");
        _burn(from, amount);
        emit Burned(from, amount);
    }
}
