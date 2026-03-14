const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying BlockPay contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy MockStablecoin
  console.log("\n[1/3] Deploying MockStablecoin...");
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const stablecoin = await MockStablecoin.deploy();
  await stablecoin.waitForDeployment();
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("  MockStablecoin deployed to:", stablecoinAddress);

  // 2. Deploy ComplianceRegistry (default limit: 500 USDC = 500_000_000 with 6 decimals)
  console.log("\n[2/3] Deploying ComplianceRegistry...");
  const defaultLimit = hre.ethers.parseUnits("500", 6);
  const ComplianceRegistry = await hre.ethers.getContractFactory("ComplianceRegistry");
  const compliance = await ComplianceRegistry.deploy(defaultLimit);
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("  ComplianceRegistry deployed to:", complianceAddress);

  // 3. Deploy Remittance (fee collector = deployer, fee = 50 bps = 0.5%)
  console.log("\n[3/3] Deploying Remittance...");
  const feeBps = 50;
  const Remittance = await hre.ethers.getContractFactory("Remittance");
  const remittance = await Remittance.deploy(
    stablecoinAddress,
    complianceAddress,
    deployer.address,
    feeBps
  );
  await remittance.waitForDeployment();
  const remittanceAddress = await remittance.getAddress();
  console.log("  Remittance deployed to:", remittanceAddress);

  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockStablecoin: stablecoinAddress,
      ComplianceRegistry: complianceAddress,
      Remittance: remittanceAddress,
    },
    config: {
      defaultTransferLimit: "500 USDC",
      feeBps: feeBps,
      feePercent: "0.5%",
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  // Copy ABIs to backend
  const backendAbisDir = path.join(__dirname, "../../backend/abis");
  if (!fs.existsSync(backendAbisDir)) fs.mkdirSync(backendAbisDir, { recursive: true });

  const artifacts = ["MockStablecoin", "ComplianceRegistry", "Remittance"];
  for (const name of artifacts) {
    const artifact = await hre.artifacts.readArtifact(name);
    fs.writeFileSync(
      path.join(backendAbisDir, `${name}.json`),
      JSON.stringify({ abi: artifact.abi, address: deployment.contracts[name] }, null, 2)
    );
  }

  console.log("\n✅ Deployment complete!");
  console.log("   Addresses saved to:", path.join(deploymentsDir, `${hre.network.name}.json`));
  console.log("   ABIs copied to backend/abis/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
