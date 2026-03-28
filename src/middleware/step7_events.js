import { getContract } from "./step2_contract";
import { getProviderAndSigner } from "./step1_provider";

export async function listenForNewProducts(callback) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const handler = (productId, name, manufacturer, event) => {
    callback({
      productId: Number(productId),
      name,
      manufacturer,
      txHash: event.log.transactionHash,
    });
  };

  contract.on("ProductCreated", handler);

  return () => contract.off("ProductCreated", handler);
}

export async function listenForTransfers(filterProductId, callback) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const handler = (productId, from, to, location, event) => {
    const id = Number(productId);
    if (filterProductId !== null && id !== filterProductId) return;
    callback({ productId: id, from, to, location, txHash: event.log.transactionHash });
  };

  contract.on("ProductTransferred", handler);
  return () => contract.off("ProductTransferred", handler);
}

export async function fetchTransferHistory(productId) {
  const { provider } = await getProviderAndSigner();
  const contract = getContract(provider);

  const filter = contract.filters.ProductTransferred(productId);
  const events = await contract.queryFilter(filter, 0, "latest");

  return events.map((e) => ({
    from:        e.args.from,
    to:          e.args.to,
    location:    e.args.location,
    txHash:      e.transactionHash,
    blockNumber: e.blockNumber,
  }));
}