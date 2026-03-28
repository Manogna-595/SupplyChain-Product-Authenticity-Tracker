import { ethers } from "ethers";
import { getContract, ABI } from "./step2_contract";
import { getProviderAndSigner } from "./step1_provider";

export async function mintProduct(name, location) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);

  const tx = await contract.createProduct(name, location);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(ABI);
  let productId = null;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === "ProductCreated") {
        productId = Number(parsed.args.productId);
        break;
      }
    } catch {
      continue;
    }
  }

  if (productId === null) {
    throw new Error("Product ID not found. Check your ABI.");
  }

  return { productId, txHash: tx.hash };
}

export async function markDelivered(productId, location) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);

  const tx = await contract.markDelivered(productId, location);
  await tx.wait();

  return tx.hash;
}

export async function markExpired(productId) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);

  const tx = await contract.markExpired(productId);
  await tx.wait();

  return tx.hash;
}