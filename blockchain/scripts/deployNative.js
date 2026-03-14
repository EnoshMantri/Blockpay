const fs = require('fs');
const solc = require('solc');
const path = require('path');
const { ethers } = require('ethers');

async function compileAndDeploy() {
    console.log("Reading Unified.sol...");
    const source = fs.readFileSync(path.join(__dirname, '../contracts/Unified.sol'), 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'Unified.sol': { content: source }
        },
        settings: {
            outputSelection: {
                '*': { '*': ['*'] }
            }
        }
    };

    console.log("Compiling via solc...");
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        output.errors.forEach(err => console.error(err.formattedMessage));
        if (output.errors.some(e => e.severity === 'error')) process.exit(1);
    }

    const contracts = output.contracts['Unified.sol'];

    // Setup Provider & Wallet
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

    console.log("Deploying securely with local wallet:", wallet.address);

    let currentNonce = await provider.getTransactionCount(wallet.address);

    const deploy = async (name, ...args) => {
        const contract = contracts[name];
        const factory = new ethers.ContractFactory(contract.abi, contract.evm.bytecode.object, wallet);
        const deployed = await factory.deploy(...args, { nonce: currentNonce++ });
        await deployed.waitForDeployment();
        return {
            instance: deployed,
            address: await deployed.getAddress(),
            abi: contract.abi
        };
    };

    const bpusd = await deploy('BlockPayUSD');
    console.log("BPUSD deployed:", bpusd.address);

    const compliance = await deploy('ComplianceRegistry');
    console.log("ComplianceRegistry deployed:", compliance.address);

    const settlement = await deploy('SettlementEngine', bpusd.address, compliance.address, wallet.address);
    console.log("SettlementEngine deployed:", settlement.address);

    // Setup integrations
    const tx = await bpusd.instance.setOperator(settlement.address, true, { nonce: currentNonce++ });
    await tx.wait();
    console.log("SettlementEngine granted operator rights on BPUSD");

    const contractData = {
        BPUSD: { address: bpusd.address, abi: bpusd.abi },
        ComplianceRegistry: { address: compliance.address, abi: compliance.abi },
        SettlementEngine: { address: settlement.address, abi: settlement.abi }
    };

    fs.writeFileSync(path.join(__dirname, '../../backend/contractData.json'), JSON.stringify(contractData, null, 2));
    console.log("Deployment complete! Overwrote backend/contractData.json");
}

compileAndDeploy().catch(console.error);
