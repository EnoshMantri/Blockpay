// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockStablecoin.sol";
import "./ComplianceRegistry.sol";

/**
 * @title Remittance
 * @notice Core settlement orchestrator for BlockPay cross-border remittance
 * @dev Implements 6-stage deterministic settlement lifecycle with programmable compliance
 */
contract Remittance is Ownable, ReentrancyGuard {
    MockStablecoin public immutable stablecoin;
    ComplianceRegistry public immutable compliance;

    address public feeCollector;
    uint256 public feeBps; // fee in basis points (50 = 0.5%)

    uint256 private _remittanceCount;

    struct RemittanceRecord {
        uint256 id;
        address sender;
        address receiver;
        uint256 grossAmount;
        uint256 fee;
        uint256 netAmount;
        uint256 timestamp;
        bytes32 settlementHash;
    }

    mapping(uint256 => RemittanceRecord) public remittances;

    event RemittanceCreated(
        uint256 indexed remittanceId,
        address indexed sender,
        address indexed receiver,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount
    );

    event RemittanceSettled(
        uint256 indexed remittanceId,
        address indexed receiver,
        uint256 netAmount,
        bytes32 settlementHash,
        uint256 blockNumber
    );

    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeCollectorUpdated(address oldCollector, address newCollector);

    constructor(
        address _stablecoin,
        address _compliance,
        address _feeCollector,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_compliance != address(0), "Invalid compliance");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_feeBps <= 1000, "Fee too high"); // max 10%

        stablecoin = MockStablecoin(_stablecoin);
        compliance = ComplianceRegistry(_compliance);
        feeCollector = _feeCollector;
        feeBps = _feeBps;
    }

    /**
     * @notice Execute a cross-border remittance with full compliance enforcement
     * @param receiver Destination wallet address
     * @param amount Gross amount in BPUSD (6 decimals)
     * @dev Implements stages 3-5 of the 6-stage settlement lifecycle
     */
    function sendRemittance(address receiver, uint256 amount)
        external
        nonReentrant
        returns (uint256 remittanceId)
    {
        // Stage 3: Compliance Check
        require(compliance.isWhitelisted(msg.sender), "Sender not whitelisted");
        require(compliance.isWhitelisted(receiver), "Receiver not whitelisted");
        require(!compliance.isBlacklisted(msg.sender), "Sender blacklisted");
        require(!compliance.isBlacklisted(receiver), "Receiver blacklisted");
        require(amount > 0, "Amount must be positive");
        require(amount <= compliance.getLimit(msg.sender), "Exceeds transfer limit");

        // Stage 4: Fee computation and token transfer
        uint256 fee = (amount * feeBps) / 10000;
        uint256 netAmount = amount - fee;

        // Transfer gross from sender to this contract
        require(
            stablecoin.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        // Distribute fee
        if (fee > 0) {
            require(stablecoin.transfer(feeCollector, fee), "Fee transfer failed");
        }

        // Transfer net to receiver
        require(stablecoin.transfer(receiver, netAmount), "Net transfer failed");

        // Stage 5: Settlement finalization
        _remittanceCount++;
        remittanceId = _remittanceCount;

        bytes32 settlementHash = keccak256(
            abi.encodePacked(remittanceId, msg.sender, receiver, amount, block.timestamp, blockhash(block.number - 1))
        );

        remittances[remittanceId] = RemittanceRecord({
            id: remittanceId,
            sender: msg.sender,
            receiver: receiver,
            grossAmount: amount,
            fee: fee,
            netAmount: netAmount,
            timestamp: block.timestamp,
            settlementHash: settlementHash
        });

        emit RemittanceCreated(remittanceId, msg.sender, receiver, amount, fee, netAmount);
        emit RemittanceSettled(remittanceId, receiver, netAmount, settlementHash, block.number);

        return remittanceId;
    }

    /**
     * @notice Get remittance record by ID
     */
    function getRemittance(uint256 remittanceId) external view returns (RemittanceRecord memory) {
        require(remittanceId > 0 && remittanceId <= _remittanceCount, "Invalid remittance ID");
        return remittances[remittanceId];
    }

    function getTotalRemittances() external view returns (uint256) {
        return _remittanceCount;
    }

    function updateFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee too high");
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function updateFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "Invalid collector");
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }
}
