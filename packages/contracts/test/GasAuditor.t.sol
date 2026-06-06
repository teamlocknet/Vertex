// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/core/GasAuditor.sol";

contract GasAuditorTest is Test {
    GasAuditor auditor;

    function setUp() public {
        auditor = new GasAuditor(address(this), 10_000);
    }

    // ── setMaxGasPerOp ───────────────────────────────────────────────────────

    function test_OwnerCanSetMaxGasPerOp() public {
        auditor.setMaxGasPerOp(50_000);
        assertEq(auditor.maxGasPerOp(), 50_000);
    }

    function test_NonOwnerCannotSet() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert();
        auditor.setMaxGasPerOp(1);
    }

    function test_ZeroMaxGasReverts() public {
        vm.expectRevert(GasAuditor.ZeroMaxGas.selector);
        auditor.setMaxGasPerOp(0);
    }

    function test_EmitsEventOnUpdate() public {
        vm.expectEmit(false, false, false, true);
        emit GasAuditor.MaxGasPerOpUpdated(10_000, 20_000);
        auditor.setMaxGasPerOp(20_000);
    }

    // ── auditBatch ───────────────────────────────────────────────────────────

    function test_ZeroOpCountAlwaysTrue() public view {
        assertTrue(auditor.auditBatch(1, 0));
    }

    function test_AuditPassesWithLowThreshold() public {
        auditor.setMaxGasPerOp(1);
        assertTrue(auditor.auditBatch(1, 100));
    }

    function test_AuditFailsWithInfiniteThreshold() public {
        auditor.setMaxGasPerOp(type(uint256).max / 2);
        assertFalse(auditor.auditBatch(1, 3));
    }

    function test_AuditFailsWhenGasInsufficient() public {
        auditor.setMaxGasPerOp(type(uint64).max);
        assertFalse(auditor.auditBatch(1, 1));
    }

    function test_ChannelIdIgnoredInCurrentImpl() public {
        auditor.setMaxGasPerOp(1);
        bool r1 = auditor.auditBatch(1, 5);
        bool r2 = auditor.auditBatch(999, 5);
        assertEq(r1, r2);
    }

    // ── Constructor guards ───────────────────────────────────────────────────

    function test_ConstructorZeroMaxGasReverts() public {
        vm.expectRevert(GasAuditor.ZeroMaxGas.selector);
        new GasAuditor(address(this), 0);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_OverflowAlwaysFalse(uint256 opCount) public {
        vm.assume(opCount >= 2);
        auditor.setMaxGasPerOp(type(uint256).max / 2);
        assertFalse(auditor.auditBatch(1, opCount));
    }
}
