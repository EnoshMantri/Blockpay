// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BlockPayUSD.sol";
import "./ComplianceRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SettlementEngine is Ownable {
    BlockPayUSD public token;
    ComplianceRegistry public compliance;
    address public treasury;

    event RemittanceSettled(
        string remittanceId,
        address indexed sender,
        address indexed receiver,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount
    );

    constructor(address _token, address _compliance, address _treasury) Ownable(msg.sender) {
        token = BlockPayUSD(_token);
        compliance = ComplianceRegistry(_compliance);
        treasury = _treasury;
    }

    // Called by the Backend Admin
    function executeRemittance(
        string calldata remittanceId,
        address sender,
        address receiver,
        uint256 grossAmount
    ) external onlyOwner {
        require(compliance.canTransfer(sender, receiver, grossAmount), "Compliance block: sender/receiver not whitelisted or limit exceeded");

        uint256 fee = (grossAmount * 5) / 1000; // 0.5%
        uint256 netAmount = grossAmount - fee;

        // Force transfer from sender. The backend must have minted `grossAmount` to `sender` first!
        token.forceTransfer(sender, receiver, netAmount);
        if (fee > 0) {
            token.forceTransfer(sender, treasury, fee);
        }

        emit RemittanceSettled(remittanceId, sender, receiver, grossAmount, fee, netAmount);
    }
}
