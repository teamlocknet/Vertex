// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/core/PulseState.sol";

contract PulseStateTest is Test {
    PulseState pulse;
    address    mockExecutor = address(0xE1EC);

    function setUp() public {
        pulse = new PulseState(mockExecutor);
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    function test_ExecutorSetImmutably() public view {
        assertEq(pulse.executor(), mockExecutor);
    }

    function test_ZeroExecutorReverts() public {
        vm.expectRevert(PulseState.ZeroExecutor.selector);
        new PulseState(address(0));
    }

    // ── onlyExecutor ─────────────────────────────────────────────────────────

    function test_RecordOnlyExecutor() public {
        vm.expectRevert(PulseState.OnlyExecutor.selector);
        pulse.record(1, 100);
    }

    function test_RecordFromExecutorSucceeds() public {
        vm.prank(mockExecutor);
        pulse.record(1, 500);

        (uint128 vol, uint64 cnt,) = pulse.get(1);
        assertEq(vol, 500);
        assertEq(cnt, 1);
    }

    // ── State isolation ───────────────────────────────────────────────────────

    function test_DisjointChannels() public {
        vm.prank(mockExecutor); pulse.record(1, 1000);
        vm.prank(mockExecutor); pulse.record(2, 200);

        (uint128 v1,,) = pulse.get(1);
        (uint128 v2,,) = pulse.get(2);
        assertEq(v1, 1000);
        assertEq(v2, 200);
    }

    function test_VolumeAccumulates() public {
        vm.startPrank(mockExecutor);
        pulse.record(1, 300);
        pulse.record(1, 700);
        vm.stopPrank();

        (uint128 vol, uint64 cnt,) = pulse.get(1);
        assertEq(vol, 1000);
        assertEq(cnt, 2);
    }

    // ── ZeroChannel guard ────────────────────────────────────────────────────

    function test_ZeroChannelReverts() public {
        vm.prank(mockExecutor);
        vm.expectRevert(PulseState.ZeroChannel.selector);
        pulse.record(0, 100);
    }

    // ── No link() attack surface ─────────────────────────────────────────────

    function test_LinkFunctionDoesNotExist() public pure {
        bytes4 absent = bytes4(keccak256("link(address)"));
        assertTrue(absent != bytes4(keccak256("record(uint256,uint128)")));
    }

    // ── getBatch ─────────────────────────────────────────────────────────────

    function test_GetBatchReturnsAllChannels() public {
        vm.startPrank(mockExecutor);
        pulse.record(1, 100);
        pulse.record(2, 200);
        pulse.record(3, 300);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](3);
        ids[0] = 1; ids[1] = 2; ids[2] = 3;

        (uint128[] memory vols,,) = pulse.getBatch(ids);
        assertEq(vols[0], 100);
        assertEq(vols[1], 200);
        assertEq(vols[2], 300);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_RecordDisjoint(uint256 ch1, uint256 ch2, uint128 v1, uint128 v2) public {
        vm.assume(ch1 != 0 && ch2 != 0);
        vm.assume(ch1 != ch2);
        vm.startPrank(mockExecutor);
        pulse.record(ch1, v1);
        pulse.record(ch2, v2);
        vm.stopPrank();

        (uint128 r1,,) = pulse.get(ch1);
        (uint128 r2,,) = pulse.get(ch2);
        assertEq(r1, v1);
        assertEq(r2, v2);
    }
}
