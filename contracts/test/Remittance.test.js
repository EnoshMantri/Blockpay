const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockPay Smart Contract Suite", function () {
  let stablecoin, compliance, remittance;
  let owner, sender, receiver, feeCollector, other;
  const DEFAULT_LIMIT = ethers.parseUnits("500", 6); // 500 USDC
  const FEE_BPS = 50; // 0.5%

  beforeEach(async function () {
    [owner, sender, receiver, feeCollector, other] = await ethers.getSigners();

    // Deploy contracts
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();

    const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
    compliance = await ComplianceRegistry.deploy(DEFAULT_LIMIT);

    const Remittance = await ethers.getContractFactory("Remittance");
    remittance = await Remittance.deploy(
      await stablecoin.getAddress(),
      await compliance.getAddress(),
      feeCollector.address,
      FEE_BPS
    );

    // Mint tokens to sender for tests
    await stablecoin.mint(sender.address, ethers.parseUnits("1000", 6));
    // Approve remittance contract
    await stablecoin.connect(sender).approve(await remittance.getAddress(), ethers.parseUnits("1000", 6));
  });

  // ─── ComplianceRegistry Tests ───────────────────────────────────────────────

  it("1. Wallet whitelisting stores correct compliance state", async function () {
    const limit = ethers.parseUnits("300", 6);
    await compliance.whitelistWallet(sender.address, limit);

    const [whitelisted, blacklisted, transferLimit] = await compliance.getWalletStatus(sender.address);
    expect(whitelisted).to.be.true;
    expect(blacklisted).to.be.false;
    expect(transferLimit).to.equal(limit);
  });

  it("2. Blacklisting atomically revokes whitelist status", async function () {
    await compliance.whitelistWallet(sender.address, 0);
    expect(await compliance.isWhitelisted(sender.address)).to.be.true;

    await compliance.blacklistWallet(sender.address);
    expect(await compliance.isWhitelisted(sender.address)).to.be.false;
    expect(await compliance.isBlacklisted(sender.address)).to.be.true;
  });

  it("3. Whitelisting a blacklisted wallet reverts with expected reason string", async function () {
    await compliance.blacklistWallet(sender.address);
    await expect(compliance.whitelistWallet(sender.address, 0))
      .to.be.revertedWith("Cannot whitelist blacklisted wallet");
  });

  it("4. Transfer limit is correctly stored and returned by getLimit()", async function () {
    const limit = ethers.parseUnits("250", 6);
    await compliance.whitelistWallet(sender.address, limit);
    expect(await compliance.getLimit(sender.address)).to.equal(limit);
  });

  // ─── Remittance Compliance Enforcement Tests ────────────────────────────────

  it("5. sendRemittance() reverts when sender is not whitelisted", async function () {
    await compliance.whitelistWallet(receiver.address, 0);
    await expect(
      remittance.connect(sender).sendRemittance(receiver.address, ethers.parseUnits("100", 6))
    ).to.be.revertedWith("Sender not whitelisted");
  });

  it("6. sendRemittance() reverts when receiver is not whitelisted", async function () {
    await compliance.whitelistWallet(sender.address, 0);
    await expect(
      remittance.connect(sender).sendRemittance(receiver.address, ethers.parseUnits("100", 6))
    ).to.be.revertedWith("Receiver not whitelisted");
  });

  it("7. sendRemittance() reverts when sender is blacklisted", async function () {
    await compliance.whitelistWallet(sender.address, 0);
    await compliance.whitelistWallet(receiver.address, 0);
    await compliance.blacklistWallet(sender.address);

    await expect(
      remittance.connect(sender).sendRemittance(receiver.address, ethers.parseUnits("100", 6))
    ).to.be.revertedWith("Sender blacklisted");
  });

  it("8. sendRemittance() reverts when amount exceeds per-wallet limit", async function () {
    await compliance.whitelistWallet(sender.address, ethers.parseUnits("100", 6)); // limit = 100
    await compliance.whitelistWallet(receiver.address, 0);

    await expect(
      remittance.connect(sender).sendRemittance(receiver.address, ethers.parseUnits("200", 6))
    ).to.be.revertedWith("Exceeds transfer limit");
  });

  it("9. Platform fee is correctly computed at 50 basis points (0.5%)", async function () {
    await compliance.whitelistWallet(sender.address, 0);
    await compliance.whitelistWallet(receiver.address, 0);

    const amount = ethers.parseUnits("100", 6);
    const expectedFee = (amount * BigInt(FEE_BPS)) / BigInt(10000); // 0.5 USDC
    const expectedNet = amount - expectedFee; // 99.5 USDC

    const receiverBefore = await stablecoin.balanceOf(receiver.address);
    const feeBefore = await stablecoin.balanceOf(feeCollector.address);

    const tx = await remittance.connect(sender).sendRemittance(receiver.address, amount);
    const receipt = await tx.wait();

    expect(await stablecoin.balanceOf(receiver.address)).to.equal(receiverBefore + expectedNet);
    expect(await stablecoin.balanceOf(feeCollector.address)).to.equal(feeBefore + expectedFee);

    // Verify events
    const created = receipt.logs.find(l => l.fragment?.name === "RemittanceCreated");
    expect(created).to.not.be.undefined;
  });
});
