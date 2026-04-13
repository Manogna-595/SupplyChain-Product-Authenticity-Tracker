// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SupplyChainTracker {

    // ─── ROLES ───────────────────────────────────────────────
    bytes32 public constant MANUFACTURER_ROLE = keccak256(abi.encodePacked("MANUFACTURER_ROLE"));
    bytes32 public constant DISTRIBUTOR_ROLE  = keccak256(abi.encodePacked("DISTRIBUTOR_ROLE"));
    bytes32 public constant RETAILER_ROLE     = keccak256(abi.encodePacked("RETAILER_ROLE"));

    // ─── ROLE STORAGE ────────────────────────────────────────
    address public admin;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    // ─── PRODUCT STATUS ──────────────────────────────────────
    enum Status { Manufactured, InTransit, Delivered, Expired }

    // ─── CHECKPOINT ──────────────────────────────────────────
    struct Checkpoint {
        string  location;
        uint256 timestamp;
        address handledBy;
    }

    // ─── PRODUCT ─────────────────────────────────────────────
    struct Product {
        uint256    productId;
        string     name;
        address    currentOwner;
        Status     status;
        Checkpoint[] history;
    }

    // ─── PRODUCT STORAGE ─────────────────────────────────────
    uint256 private _productCounter;
    mapping(uint256 => Product) private _products;

    // ─── CONSTRUCTOR ─────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ─── ROLE MANAGEMENT ─────────────────────────────────────
    function grantRole(bytes32 role, address account) public {
        require(msg.sender == admin, "Only admin can grant roles");
        require(account != address(0), "Cannot grant role to zero address");
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) public {
        require(msg.sender == admin, "Only admin can revoke roles");
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    // ─── MODIFIERS ───────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Access denied: wrong role");
        _;
    }

    modifier onlyOwner(uint256 productId) {
        require(_products[productId].currentOwner == msg.sender, "Not the current owner");
        _;
    }

    // ─── EVENTS ──────────────────────────────────────────────
    event ProductCreated(uint256 indexed productId, string name, address manufacturer);
    event ProductTransferred(uint256 indexed productId, address from, address to, string location);
    event ProductStatusUpdated(uint256 indexed productId, Status newStatus);

    // ─── CORE FUNCTIONS ──────────────────────────────────────
    function createProduct(string memory name, string memory location)
        public
        onlyRole(MANUFACTURER_ROLE)
        returns (uint256)
    {
        _productCounter++;
        uint256 newId = _productCounter;

        Product storage p = _products[newId];
        p.productId    = newId;
        p.name         = name;
        p.currentOwner = msg.sender;
        p.status       = Status.Manufactured;

        p.history.push(Checkpoint({
            location  : location,
            timestamp : block.timestamp,
            handledBy : msg.sender
        }));

        emit ProductCreated(newId, name, msg.sender);
        return newId;
    }

    // ─── SIGNATURE HELPERS ───────────────────────────────────
    function getTransferHash(uint256 productId, address from)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(productId, from));
    }

    function recoverSigner(bytes32 hash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(ethSignedHash, v, r, s);
    }

    function transferProduct(
        uint256 productId,
        address to,
        string memory location,
        bytes memory receiverSignature
    )
        public
        onlyOwner(productId)
    {
        require(to != address(0), "Cannot transfer to zero address");
        require(_products[productId].status != Status.Expired, "Product is expired");
        require(
            _roles[DISTRIBUTOR_ROLE][to] || _roles[RETAILER_ROLE][to],
            "Receiver must be a distributor or retailer"
        );

        bytes32 hash = getTransferHash(productId, msg.sender);
        address signer = recoverSigner(hash, receiverSignature);
        require(signer == to, "Invalid receiver signature");

        Product storage p = _products[productId];
        address previousOwner = p.currentOwner;

        p.currentOwner = to;
        p.status       = Status.InTransit;

        p.history.push(Checkpoint({
            location  : location,
            timestamp : block.timestamp,
            handledBy : msg.sender
        }));

        emit ProductTransferred(productId, previousOwner, to, location);
    }

    // ─── STATUS FUNCTIONS ────────────────────────────────────
    function markDelivered(uint256 productId, string memory location)
        public
        onlyOwner(productId)
    {
        require(_products[productId].status == Status.InTransit, "Product must be InTransit");

        Product storage p = _products[productId];
        p.status = Status.Delivered;

        p.history.push(Checkpoint({
            location  : location,
            timestamp : block.timestamp,
            handledBy : msg.sender
        }));

        emit ProductStatusUpdated(productId, Status.Delivered);
    }

    function markExpired(uint256 productId)
        public
        onlyAdmin()
    {
        require(_products[productId].status != Status.Expired, "Already expired");
        _products[productId].status = Status.Expired;
        emit ProductStatusUpdated(productId, Status.Expired);
    }

    // ─── READ FUNCTIONS ──────────────────────────────────────
    function getProduct(uint256 productId)
        public
        view
        returns (
            uint256 id,
            string memory name,
            address currentOwner,
            Status status,
            uint256 historyLength
        )
    {
        Product storage p = _products[productId];
        require(p.productId != 0, "Product does not exist");
        return (p.productId, p.name, p.currentOwner, p.status, p.history.length);
    }

    function getCheckpoint(uint256 productId, uint256 index)
        public
        view
        returns (
            string memory location,
            uint256 timestamp,
            address handledBy
        )
    {
        Product storage p = _products[productId];
        require(p.productId != 0, "Product does not exist");
        require(index < p.history.length, "Checkpoint index out of range");
        Checkpoint storage c = p.history[index];
        return (c.location, c.timestamp, c.handledBy);
    }

    function getProductCount() public view returns (uint256) {
        return _productCounter;
    }
}