const hre = require("hardhat");

async function main() {
  console.log("Deploying SupplyChainTracker...");

  const Contract = await hre.ethers.getContractFactory("SupplyChainTracker");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SupplyChainTracker deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});