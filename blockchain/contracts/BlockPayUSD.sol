// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlockPayUSD is ERC20, Ownable {
    mapping(address => bool) public isOperator;

    constructor() ERC20("BlockPay USD", "BPUSD") Ownable(msg.sender) {
        isOperator[msg.sender] = true;
    }

    function setOperator(address op, bool status) external onlyOwner {
        isOperator[op] = status;
    }

    modifier onlyOperator() {
        require(isOperator[msg.sender], "Not authorized operator");
        _;
    }

    function mint(address to, uint256 amount) external onlyOperator {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external onlyOperator {
        _burn(from, amount);
    }

    function forceTransfer(address from, address to, uint256 amount) external onlyOperator {
        _transfer(from, to, amount);
    }
}
