// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract GasAuditor is Ownable {
    uint256 public maxGasPerOp;

    event MaxGasPerOpUpdated(uint256 oldValue, uint256 newValue);

    error ZeroMaxGas();
    error BatchUnsafe(uint256 required, uint256 available);

    constructor(address owner_, uint256 maxGasPerOp_) Ownable(owner_) {
        if (maxGasPerOp_ == 0) revert ZeroMaxGas();
        maxGasPerOp = maxGasPerOp_;
    }

    function setMaxGasPerOp(uint256 value) external onlyOwner {
        if (value == 0) revert ZeroMaxGas();
        emit MaxGasPerOpUpdated(maxGasPerOp, value);
        maxGasPerOp = value;
    }

    /// @notice Returns true when gasleft() can cover opCount * maxGasPerOp.
    ///         channelId reserved for future per-channel overrides.
    function auditBatch(uint256 /*channelId*/, uint256 opCount) external view returns (bool) {
        if (opCount == 0) return true;
        uint256 required;
        unchecked { required = opCount * maxGasPerOp; }
        if (required / opCount != maxGasPerOp) return false;
        return gasleft() >= required;
    }
}
