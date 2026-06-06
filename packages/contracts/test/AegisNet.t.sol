// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/core/AegisNet.sol";

contract AegisNetTest is Test {
    AegisNet aegis;

    address constant ALICE   = address(0xA11CE);
    address constant BOB     = address(0xB0B);
    address constant STRANGER = address(0x5757);
    uint256 constant CH1     = 1;
    uint256 constant CH2     = 2;

    function setUp() public {
        aegis = new AegisNet(address(this));
    }

    // ── authorize ────────────────────────────────────────────────────────────

    function test_AuthorizeGrantsPermission() public {
        assertFalse(aegis.isAuthorized(ALICE, CH1));
        aegis.authorize(ALICE, CH1);
        assertTrue(aegis.isAuthorized(ALICE, CH1));
    }

    function test_AuthorizeEmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit AegisNet.Authorized(ALICE, CH1);
        aegis.authorize(ALICE, CH1);
    }

    function test_AuthorizeOnlyOwner() public {
        vm.prank(STRANGER);
        vm.expectRevert();
        aegis.authorize(ALICE, CH1);
    }

    function test_AuthorizeZeroAddressReverts() public {
        vm.expectRevert(AegisNet.ZeroAddress.selector);
        aegis.authorize(address(0), CH1);
    }

    function test_AuthorizeZeroChannelReverts() public {
        vm.expectRevert(AegisNet.ZeroChannel.selector);
        aegis.authorize(ALICE, 0);
    }

    // ── revoke ───────────────────────────────────────────────────────────────

    function test_RevokeRemovesPermission() public {
        aegis.authorize(ALICE, CH1);
        aegis.revoke(ALICE, CH1);
        assertFalse(aegis.isAuthorized(ALICE, CH1));
    }

    function test_RevokeEmitsEvent() public {
        aegis.authorize(ALICE, CH1);
        vm.expectEmit(true, true, false, false);
        emit AegisNet.Revoked(ALICE, CH1);
        aegis.revoke(ALICE, CH1);
    }

    function test_RevokeOnlyOwner() public {
        aegis.authorize(ALICE, CH1);
        vm.prank(STRANGER);
        vm.expectRevert();
        aegis.revoke(ALICE, CH1);
    }

    function test_RevokeZeroAddressReverts() public {
        vm.expectRevert(AegisNet.ZeroAddress.selector);
        aegis.revoke(address(0), CH1);
    }

    function test_RevokeZeroChannelReverts() public {
        vm.expectRevert(AegisNet.ZeroChannel.selector);
        aegis.revoke(ALICE, 0);
    }

    function test_RevokeNonExistentPermissionReverts() public {
        vm.expectRevert(AegisNet.NotAuthorized.selector);
        aegis.revoke(ALICE, CH1);
    }

    // ── isAuthorized isolation ───────────────────────────────────────────────

    function test_PermissionsAreDisjointPerChannel() public {
        aegis.authorize(ALICE, CH1);
        assertFalse(aegis.isAuthorized(ALICE, CH2));
    }

    function test_PermissionsAreDisjointPerUser() public {
        aegis.authorize(ALICE, CH1);
        assertFalse(aegis.isAuthorized(BOB, CH1));
    }

    function test_ReAuthorizeAfterRevoke() public {
        aegis.authorize(ALICE, CH1);
        aegis.revoke(ALICE, CH1);
        aegis.authorize(ALICE, CH1);
        assertTrue(aegis.isAuthorized(ALICE, CH1));
    }

    function test_UnauthorizedByDefault() public view {
        assertFalse(aegis.isAuthorized(STRANGER, CH1));
        assertFalse(aegis.isAuthorized(STRANGER, CH2));
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_AuthorizeRevokeCycle(address user, uint256 channelId) public {
        vm.assume(user != address(0) && channelId != 0);

        assertFalse(aegis.isAuthorized(user, channelId));

        aegis.authorize(user, channelId);
        assertTrue(aegis.isAuthorized(user, channelId));

        aegis.revoke(user, channelId);
        assertFalse(aegis.isAuthorized(user, channelId));
    }

    // ── batchAuthorize ───────────────────────────────────────────────────────

    function test_BatchAuthorizeGrantsAll() public {
        address[] memory users = new address[](2);
        users[0] = ALICE;
        users[1] = BOB;
        aegis.batchAuthorize(users, CH1);
        assertTrue(aegis.isAuthorized(ALICE, CH1));
        assertTrue(aegis.isAuthorized(BOB,   CH1));
    }

    function test_BatchAuthorizeOnlyOwner() public {
        address[] memory users = new address[](1);
        users[0] = ALICE;
        vm.prank(STRANGER);
        vm.expectRevert();
        aegis.batchAuthorize(users, CH1);
    }

    function test_BatchAuthorizeZeroChannelReverts() public {
        address[] memory users = new address[](1);
        users[0] = ALICE;
        vm.expectRevert(AegisNet.ZeroChannel.selector);
        aegis.batchAuthorize(users, 0);
    }

    function testFuzz_DisjointPermissions(
        address u1, address u2,
        uint256 ch1, uint256 ch2
    ) public {
        vm.assume(u1 != address(0) && u2 != address(0));
        vm.assume(ch1 != 0 && ch2 != 0);
        vm.assume(u1 != u2 || ch1 != ch2);

        aegis.authorize(u1, ch1);

        assertFalse(aegis.isAuthorized(u2, ch2));
    }
}
