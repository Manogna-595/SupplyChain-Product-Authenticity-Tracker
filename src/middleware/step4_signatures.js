import { ethers } from "ethers";
import { getContract } from "./step2_contract";
import { getProviderAndSigner } from "./step1_provider";

export async function signAsReceiver(productId, fromAddress) {
  const { signer, provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const hash = await contract.getTransferHash(productId, fromAddress);

  const signature = await signer.signMessage(ethers.getBytes(hash));

  return signature;
}

export async function executeTransfer(productId, toAddress, location, receiverSignature) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);

  const tx = await contract.transferProduct(
    productId,
    toAddress,
    location,
    receiverSignature
  );

  await tx.wait();
  return tx.hash;
}

export async function getTransferHashForDisplay(productId, fromAddress) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);
  return await contract.getTransferHash(productId, fromAddress);
}