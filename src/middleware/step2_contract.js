import { ethers } from "ethers";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export const ABI = [
  "function admin() view returns (address)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function createProduct(string name, string location) returns (uint256)",
  "function transferProduct(uint256 productId, address to, string location, bytes receiverSignature)",
  "function markDelivered(uint256 productId, string location)",
  "function markExpired(uint256 productId)",
  "function getProduct(uint256 productId) view returns (uint256 id, string name, address currentOwner, uint8 status, uint256 historyLength)",
  "function getCheckpoint(uint256 productId, uint256 index) view returns (string location, uint256 timestamp, address handledBy)",
  "function getProductCount() view returns (uint256)",
  "function getTransferHash(uint256 productId, address from) pure returns (bytes32)",
  "event ProductCreated(uint256 indexed productId, string name, address manufacturer)",
  "event ProductTransferred(uint256 indexed productId, address from, address to, string location)",
  "event ProductStatusUpdated(uint256 indexed productId, uint8 newStatus)",
];

export function getContract(signerOrProvider) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signerOrProvider);
}