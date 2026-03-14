import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

  console.log("Deploying contracts with account:", wallet.address);

  const getArtifact = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`)));

  const bpusdArt = getArtifact("BlockPayUSD");
  const BPUSD = new ethers.ContractFactory(bpusdArt.abi, bpusdArt.bytecode, wallet);
  const bpusd = await BPUSD.deploy();
  await bpusd.waitForDeployment();
  const bpusdAddress = await bpusd.getAddress();
  console.log("BlockPayUSD deployed to:", bpusdAddress);

  const compArt = getArtifact("ComplianceRegistry");
  const Compliance = new ethers.ContractFactory(compArt.abi, compArt.bytecode, wallet);
  const compliance = await Compliance.deploy();
  await compliance.waitForDeployment();
  const complianceAddress = await compliance.getAddress();
  console.log("ComplianceRegistry deployed to:", complianceAddress);

  const setArt = getArtifact("SettlementEngine");
  const Settlement = new ethers.ContractFactory(setArt.abi, setArt.bytecode, wallet);
  const settlement = await Settlement.deploy(bpusdAddress, complianceAddress, wallet.address);
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log("SettlementEngine deployed to:", settlementAddress);

  let tx = await bpusd.setOperator(settlementAddress, true);
  await tx.wait();
  console.log("SettlementEngine authorized on BPUSD");

  // Mint 1,000,000 BPUSD (6 decimals) to Account 0 (sender)
  const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const ACCOUNT_1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const mintAmount = ethers.parseUnits("1000000", 6);

  tx = await bpusd.mint(ACCOUNT_0, mintAmount);
  await tx.wait();
  console.log("Minted 1,000,000 BPUSD to Account 0:", ACCOUNT_0);

  tx = await bpusd.mint(ACCOUNT_1, mintAmount);
  await tx.wait();
  console.log("Minted 1,000,000 BPUSD to Account 1:", ACCOUNT_1);

  // Whitelist both accounts with a 1,000,000 BPUSD transfer limit
  const limit = ethers.parseUnits("1000000", 6);

  tx = await compliance.whitelist(ACCOUNT_0, limit);
  await tx.wait();
  console.log("Whitelisted Account 0");

  tx = await compliance.whitelist(ACCOUNT_1, limit);
  await tx.wait();
  console.log("Whitelisted Account 1");

  // Also approve the SettlementEngine to spend from Account 0's wallet
  // Account 0 is the deployer wallet, so we can approve directly
  tx = await bpusd.approve(settlementAddress, ethers.MaxUint256);
  await tx.wait();
  console.log("Approved SettlementEngine to spend Account 0 BPUSD");

  const contractData = {
    BPUSD: { address: bpusdAddress, abi: bpusdArt.abi },
    ComplianceRegistry: { address: complianceAddress, abi: compArt.abi },
    SettlementEngine: { address: settlementAddress, abi: setArt.abi }
  };

  fs.writeFileSync(path.join(__dirname, "../../backend/contractData.json"), JSON.stringify(contractData, null, 2));

  console.log("Deployment complete! contractData.json written to backend.");
}

main().catch(console.error);
