import { ethers } from "ethers";
import { getContract } from "./step2_contract";
import { getProviderAndSigner } from "./step1_provider";

export const ROLES = {
  MANUFACTURER: ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE")),
  DISTRIBUTOR:  ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")),
  RETAILER:     ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE")),
};

export async function detectRoles(address) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const [adminAddress, isMfr, isDist, isRetailer] = await Promise.all([
    contract.admin(),
    contract.hasRole(ROLES.MANUFACTURER, address),
    contract.hasRole(ROLES.DISTRIBUTOR,  address),
    contract.hasRole(ROLES.RETAILER,     address),
  ]);

  const isAdmin = adminAddress.toLowerCase() === address.toLowerCase();

  let label = "Guest";
  if (isAdmin)    label = "Admin";
  if (isMfr)      label = "Manufacturer";
  if (isDist)     label = "Distributor";
  if (isRetailer) label = "Retailer";

  return { isAdmin, isMfr, isDist, isRetailer, label };
}

export async function grantRole(roleKey, address) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);
  const tx = await contract.grantRole(ROLES[roleKey], address);
  await tx.wait();
  return tx.hash;
}

export async function revokeRole(roleKey, address) {
  const { signer } = await getProviderAndSigner();
  const contract = getContract(signer);
  const tx = await contract.revokeRole(ROLES[roleKey], address);
  await tx.wait();
  return tx.hash;
}