const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChainTracker", function () {
  let contract;
  let admin, manufacturer, distributor, retailer, random;

  const MANUFACTURER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANUFACTURER_ROLE"));
  const DISTRIBUTOR_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  const RETAILER_ROLE     = ethers.keccak256(ethers.toUtf8Bytes("RETAILER_ROLE"));

  beforeEach(async function () {
    [admin, manufacturer, distributor, retailer, random] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory("SupplyChainTracker");
    contract = await Contract.deploy();
    await contract.waitForDeployment();

    // Grant roles
    await contract.grantRole(MANUFACTURER_ROLE, manufacturer.address);
    await contract.grantRole(DISTRIBUTOR_ROLE,  distributor.address);
    await contract.grantRole(RETAILER_ROLE,     retailer.address);
  });

  // ─── ROLE TESTS ───────────────────────────────────────────

  it("Should set deployer as admin", async function () {
    expect(await contract.admin()).to.equal(admin.address);
  });

  it("Should grant manufacturer role correctly", async function () {
    expect(await contract.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.equal(true);
  });

  it("Should NOT allow random user to grant roles", async function () {
    await expect(
      contract.connect(random).grantRole(MANUFACTURER_ROLE, random.address)
    ).to.be.revertedWith("Only admin can grant roles");
  });

  // ─── PRODUCT CREATION TESTS ───────────────────────────────

  it("Should allow manufacturer to create a product", async function () {
    const tx = await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva Factory");
    await tx.wait();

    const [id, name, owner, status] = await contract.getProduct(1);
    expect(name).to.equal("Luxury Watch");
    expect(owner).to.equal(manufacturer.address);
    expect(status).to.equal(0); // Manufactured
  });

  it("Should NOT allow random user to create a product", async function () {
    await expect(
      contract.connect(random).createProduct("Fake Bag", "Unknown")
    ).to.be.revertedWith("Access denied: wrong role");
  });

  it("Should increment product counter", async function () {
    await contract.connect(manufacturer).createProduct("Watch 1", "Factory A");
    await contract.connect(manufacturer).createProduct("Watch 2", "Factory B");
    expect(await contract.getProductCount()).to.equal(2);
  });

  // ─── TRANSFER TESTS ───────────────────────────────────────

  it("Should transfer product with valid receiver signature", async function () {
    // Mint product
    await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva");

    // Distributor signs
    const hash = await contract.getTransferHash(1, manufacturer.address);
    const sig  = await distributor.signMessage(ethers.getBytes(hash));

    // Manufacturer transfers
    await contract.connect(manufacturer).transferProduct(1, distributor.address, "Dubai Port", sig);

    const [,, owner, status] = await contract.getProduct(1);
    expect(owner).to.equal(distributor.address);
    expect(status).to.equal(1); // InTransit
  });

  it("Should NOT allow transfer with wrong signature", async function () {
    await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva");

    const hash = await contract.getTransferHash(1, manufacturer.address);
    // Random signs instead of distributor
    const sig  = await random.signMessage(ethers.getBytes(hash));

    await expect(
      contract.connect(manufacturer).transferProduct(1, distributor.address, "Dubai Port", sig)
    ).to.be.revertedWith("Invalid receiver signature");
  });

  it("Should NOT allow non-owner to transfer", async function () {
    await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva");

    const hash = await contract.getTransferHash(1, manufacturer.address);
    const sig  = await distributor.signMessage(ethers.getBytes(hash));

    await expect(
      contract.connect(random).transferProduct(1, distributor.address, "Dubai Port", sig)
    ).to.be.revertedWith("Not the current owner");
  });

  // ─── DELIVERY TESTS ───────────────────────────────────────

  it("Should mark product as delivered", async function () {
    // Mint and transfer to retailer
    await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva");

    const hash1 = await contract.getTransferHash(1, manufacturer.address);
    const sig1  = await distributor.signMessage(ethers.getBytes(hash1));
    await contract.connect(manufacturer).transferProduct(1, distributor.address, "Dubai", sig1);

    const hash2 = await contract.getTransferHash(1, distributor.address);
    const sig2  = await retailer.signMessage(ethers.getBytes(hash2));
    await contract.connect(distributor).transferProduct(1, retailer.address, "Paris", sig2);

    // Retailer marks delivered
    await contract.connect(retailer).markDelivered(1, "Paris Store");

    const [,,, status] = await contract.getProduct(1);
    expect(status).to.equal(2); // Delivered
  });

  it("Should NOT mark delivered if not InTransit", async function () {
    await contract.connect(manufacturer).createProduct("Luxury Watch", "Geneva");

    await expect(
      contract.connect(manufacturer).markDelivered(1, "Geneva")
    ).to.be.revertedWith("Product must be InTransit");
  });

  // ─── EXPIRE TESTS ─────────────────────────────────────────

  it("Should allow admin to expire a product", async function () {
    await contract.connect(manufacturer).createProduct("Medicine Batch", "Lab");
    await contract.connect(admin).markExpired(1);

    const [,,, status] = await contract.getProduct(1);
    expect(status).to.equal(3); // Expired
  });

  it("Should NOT allow non-admin to expire a product", async function () {
    await contract.connect(manufacturer).createProduct("Medicine Batch", "Lab");

    await expect(
      contract.connect(random).markExpired(1)
    ).to.be.revertedWith("Only admin");
  });
});