import { getContract } from "./step2_contract";
import { getProviderAndSigner } from "./step1_provider";

export const STATUS = {
  0: { label: "Manufactured", color: "#f59e0b", icon: "🏭" },
  1: { label: "In Transit",   color: "#3b82f6", icon: "🚢" },
  2: { label: "Delivered",    color: "#10b981", icon: "✅" },
  3: { label: "Expired",      color: "#ef4444", icon: "⚠️" },
};

export async function fetchProduct(productId) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const [id, name, currentOwner, status, historyLength] =
    await contract.getProduct(productId);

  const total = Number(historyLength);

  const checkpointPromises = Array.from({ length: total }, (_, i) =>
    contract.getCheckpoint(productId, i)
  );
  const rawCheckpoints = await Promise.all(checkpointPromises);

  const checkpoints = rawCheckpoints.map(([location, timestamp, handledBy]) => ({
    location,
    handledBy,
    timestamp: Number(timestamp),
    date: new Date(Number(timestamp) * 1000).toLocaleString(),
  }));

  return {
    id: Number(id),
    name,
    currentOwner,
    status: Number(status),
    statusLabel: STATUS[Number(status)]?.label ?? "Unknown",
    checkpoints,
  };
}

export async function fetchAllProducts() {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const count = Number(await contract.getProductCount());
  if (count === 0) return [];

  const promises = Array.from({ length: count }, (_, i) => fetchProduct(i + 1));
  return await Promise.all(promises);
}

export async function fetchMyProducts(ownerAddress) {
  const all = await fetchAllProducts();
  return all.filter(
    (p) => p.currentOwner.toLowerCase() === ownerAddress.toLowerCase()
  );
}