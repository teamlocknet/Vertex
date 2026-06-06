// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/core/VertexCore.sol";

contract VertexCoreTest is Test {
    VertexCore core;

    uint256 constant CH1 = 1;
    uint256 constant CH2 = 2;
    address constant ALICE = address(0xA11CE);
    address constant BOB   = address(0xB0B);

    function setUp() public {
        core = new VertexCore(address(this));
    }

    function test_DepositAndRead() public {
        core.deposit(CH1, ALICE, 500);
        (uint128 bal, uint64 nonce,) = core.getPartition(CH1, ALICE);
        assertEq(bal,   500);
        assertEq(nonce, 1);
    }

    function test_DisjointChannels() public {
        core.deposit(CH1, ALICE, 1000);
        core.deposit(CH2, ALICE, 200);

        (uint128 b1,,) = core.getPartition(CH1, ALICE);
        (uint128 b2,,) = core.getPartition(CH2, ALICE);
        assertEq(b1, 1000);
        assertEq(b2, 200);
    }

    function test_Withdraw() public {
        core.deposit(CH1, BOB, 800);
        core.withdraw(CH1, BOB, 300);
        (uint128 bal, uint64 nonce,) = core.getPartition(CH1, BOB);
        assertEq(bal,   500);
        assertEq(nonce, 2);
    }

    function test_WithdrawInsufficientReverts() public {
        core.deposit(CH1, ALICE, 100);
        vm.expectRevert(VertexCore.InsufficientBalance.selector);
        core.withdraw(CH1, ALICE, 200);
    }

    function test_ZeroChannelReverts() public {
        vm.expectRevert(VertexCore.ZeroChannel.selector);
        core.deposit(0, ALICE, 1);
    }

    function test_ZeroAccountReverts() public {
        vm.expectRevert(VertexCore.ZeroAccount.selector);
        core.deposit(CH1, address(0), 1);
    }

    function test_OnlyExecutorCanDeposit() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(VertexCore.OnlyExecutor.selector);
        core.deposit(CH1, ALICE, 100);
    }

    function test_OnlyExecutorCanWithdraw() public {
        core.deposit(CH1, ALICE, 100);
        vm.prank(address(0xDEAD));
        vm.expectRevert(VertexCore.OnlyExecutor.selector);
        core.withdraw(CH1, ALICE, 50);
    }

    // ── ZeroAmount guard ─────────────────────────────────────────────────────

    function test_DepositZeroAmountReverts() public {
        vm.expectRevert(VertexCore.ZeroAmount.selector);
        core.deposit(CH1, ALICE, 0);
    }

    function test_WithdrawZeroAmountReverts() public {
        core.deposit(CH1, ALICE, 100);
        vm.expectRevert(VertexCore.ZeroAmount.selector);
        core.withdraw(CH1, ALICE, 0);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_DisjointNoInterference(
        uint256 chA,
        uint256 chB,
        address acc,
        uint128 amtA,
        uint128 amtB
    ) public {
        vm.assume(chA != 0 && chB != 0 && chA != chB);
        vm.assume(acc != address(0));
        vm.assume(amtA > 0 && amtB > 0);

        core.deposit(chA, acc, amtA);
        core.deposit(chB, acc, amtB);

        (uint128 bA,,) = core.getPartition(chA, acc);
        (uint128 bB,,) = core.getPartition(chB, acc);
        assertEq(bA, amtA);
        assertEq(bB, amtB);
    }
}
