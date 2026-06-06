// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

// Lightweight channel-permission registry.
// Hot path: single SLOAD via isAuthorized() — no branching, no storage writes.
contract AegisNet is Ownable {
    // user => channelId => authorized
    mapping(address => mapping(uint256 => bool)) private _perms;

    event Authorized(address indexed user,  uint256 indexed channelId);
    event Revoked   (address indexed user,  uint256 indexed channelId);

    error ZeroAddress();
    error ZeroChannel();
    error NotAuthorized();

    constructor(address owner_) Ownable(owner_) {}

    function authorize(address user, uint256 channelId) external onlyOwner {
        if (user      == address(0)) revert ZeroAddress();
        if (channelId == 0)          revert ZeroChannel();
        _perms[user][channelId] = true;
        emit Authorized(user, channelId);
    }

    function batchAuthorize(address[] calldata users, uint256 channelId) external onlyOwner {
        if (channelId == 0) revert ZeroChannel();
        uint256 len = users.length;
        for (uint256 i; i < len; ) {
            if (users[i] == address(0)) revert ZeroAddress();
            _perms[users[i]][channelId] = true;
            emit Authorized(users[i], channelId);
            unchecked { ++i; }
        }
    }

    function revoke(address user, uint256 channelId) external onlyOwner {
        if (user      == address(0)) revert ZeroAddress();
        if (channelId == 0)          revert ZeroChannel();
        if (!_perms[user][channelId]) revert NotAuthorized();
        _perms[user][channelId] = false;
        emit Revoked(user, channelId);
    }

    function isAuthorized(address user, uint256 channelId) external view returns (bool) {
        return _perms[user][channelId];
    }
}
