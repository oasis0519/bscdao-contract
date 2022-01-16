pragma solidity ^0.7.5;

import "./libs/Ownable.sol";
import "./libs/SafeMath.sol";
import "./libs/SafeERC20.sol";

contract Referral is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public rewardToken;
    address public treasury;
    uint public minHold;

    mapping(bytes32 => address) public referrals;
    mapping(bytes32 => uint256) public rewards;

    event LogNewReferral(address indexed account, bytes32 indexed code);
    event LogClaim(address indexed recipient, uint256 amount);
    event LogDepositRewards(address indexed sender, address indexed recipient, uint256 amount);

    constructor(
        address rewardToken_,
        address treasury_,
        uint256 minHold_
    ) {
        require(rewardToken_ != address(0));
        rewardToken = rewardToken_;
        require(treasury_ != address(0));
        treasury = treasury_;

        minHold = minHold_;
    }

    function createReferral(address referrer_, bytes32 code_) external {
        _createReferral(referrer_, code_);
    }

    function _createReferral(address referrer_, bytes32 code_) internal {
        require(referrer_ != address(0), "Referrer cannot be zero");
        require(code_ != bytes32(""), "Code cannot be zero");
        require(referrals[code_] == address(0), "Code already exists");

        referrals[code_] = referrer_;

        emit LogNewReferral(referrer_, code_);
    }

    function claimRewards(bytes32 code_) external {
        address recipient = referrals[code_];
        require(recipient == msg.sender, "Not owner");

        uint256 amount = rewards[code_];
        if (amount > 0 && IERC20(rewardToken).balanceOf(address(this)) >= amount) {
            rewards[code_] = 0;
            IERC20(rewardToken).safeTransfer(recipient, amount);
        }

        emit LogClaim(recipient, amount);
    }

    function validRewards(
        bytes32 code_,
        address depositor_
    ) external view returns (bool valid) {
        address referrer = referrals[code_];
        if (
            referrer == address(0) || // code not registered
            referrer == depositor_ // depositor is code owner
            IERC20(rewardToken).balanceOf(referrer) < minHold
        ) {
            valid = false;
        } else {
            valid = true;
        }
    }

    function depositRewards(bytes32 code_, uint256 rewards_) external {
        if (rewards_ > 0 && referrals[code_] != address(0)) {
            rewards[code_] = rewards[code_].add(rewards_);
            IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), rewards_);
        }
        emit LogDepositRewards(msg.sender, referrals[code_], rewards_);
    }

    function setRewardToken(address rewardToken_) external onlyOwner() {
        require(rewardToken_ != address(0));
        rewardToken = rewardToken_;
    }

    function setMinHold(uint256 minHold_) external onlyOwner() {
        minHold = minHold_;
    }
}