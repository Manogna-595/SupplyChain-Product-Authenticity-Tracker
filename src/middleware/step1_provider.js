import { ethers } from "ethers";

export async function getProviderAndSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install it.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  return { provider, signer };
}