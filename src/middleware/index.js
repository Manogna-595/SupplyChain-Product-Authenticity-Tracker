export { getProviderAndSigner } from "./step1_provider";
export { getContract, CONTRACT_ADDRESS, ABI } from "./step2_contract";
export { ROLES, detectRoles, grantRole, revokeRole } from "./step3_roles";
export { signAsReceiver, executeTransfer, getTransferHashForDisplay } from "./step4_signatures";
export { STATUS, fetchProduct, fetchAllProducts, fetchMyProducts } from "./step5_read";
export { mintProduct, markDelivered, markExpired } from "./step6_write";
export { listenForNewProducts, listenForTransfers, fetchTransferHistory } from "./step7_events";

import { getProviderAndSigner } from "./step1_provider";
import { detectRoles } from "./step3_roles";

export async function connectWallet() {
  const { signer } = await getProviderAndSigner();
  const address = await signer.getAddress();
  const roles = await detectRoles(address);
  return { address, ...roles };
}
