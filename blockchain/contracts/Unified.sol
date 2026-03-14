// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) { return msg.sender; }
}

abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) {
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function owner() public view virtual returns (address) { return _owner; }
}

contract BlockPayUSD is Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => bool) public isOperator;
    uint256 private _totalSupply;
    string public name = "BlockPay USD";
    string public symbol = "BPUSD";
    uint8 public decimals = 6;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() Ownable(msg.sender) {
        isOperator[msg.sender] = true;
    }

    function setOperator(address op, bool status) external onlyOwner { isOperator[op] = status; }
    modifier onlyOperator() { require(isOperator[msg.sender], "Not op"); _; }

    function balanceOf(address account) public view returns (uint256) { return _balances[account]; }

    function mint(address to, uint256 amount) external onlyOperator {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyOperator {
        require(_balances[from] >= amount, "Burn > bal");
        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function forceTransfer(address from, address to, uint256 amount) external onlyOperator {
        require(_balances[from] >= amount, "Transfer > bal");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract ComplianceRegistry is Ownable {
    struct WalletData { bool whitelisted; bool blacklisted; uint256 limit; }
    mapping(address => WalletData) public registry;

    constructor() Ownable(msg.sender) {}

    function whitelist(address _wallet, uint256 _limit) external onlyOwner {
        require(!registry[_wallet].blacklisted, "Blacklisted");
        registry[_wallet] = WalletData(true, false, _limit);
    }
    function blacklist(address _wallet, string calldata) external onlyOwner {
        registry[_wallet].blacklisted = true;
        registry[_wallet].whitelisted = false;
    }
    function removeBlacklist(address _wallet) external onlyOwner { registry[_wallet].blacklisted = false; }
    function canTransfer(address _sender, address _receiver, uint256 _amount) external view returns (bool) {
        if (!registry[_sender].whitelisted || registry[_sender].blacklisted) return false;
        if (!registry[_receiver].whitelisted || registry[_receiver].blacklisted) return false;
        if (registry[_sender].limit > 0 && _amount > registry[_sender].limit) return false;
        return true;
    }
}

contract SettlementEngine is Ownable {
    BlockPayUSD public token;
    ComplianceRegistry public compliance;
    address public treasury;

    event RemittanceSettled(string remittanceId, address indexed sender, address indexed receiver, uint256 grossAmount, uint256 fee, uint256 netAmount);

    constructor(address _token, address _compliance, address _treasury) Ownable(msg.sender) {
        token = BlockPayUSD(_token);
        compliance = ComplianceRegistry(_compliance);
        treasury = _treasury;
    }

    function executeRemittance(string calldata remittanceId, address sender, address receiver, uint256 grossAmount) external onlyOwner {
        require(compliance.canTransfer(sender, receiver, grossAmount), "Comp: Blocked");
        uint256 fee = (grossAmount * 5) / 1000;
        uint256 netAmount = grossAmount - fee;
        token.forceTransfer(sender, receiver, netAmount);
        if (fee > 0) token.forceTransfer(sender, treasury, fee);
        emit RemittanceSettled(remittanceId, sender, receiver, grossAmount, fee, netAmount);
    }
}
