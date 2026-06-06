// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/core/VertexCore.sol";
import "../src/core/PulseState.sol";
import "../src/core/GasAuditor.sol";
import "../src/core/AegisNet.sol";
import "../src/core/VertexExecutor.sol";

contract VertexExecutorTest is Test {
    VertexCore     core;
    PulseState     pulse;
    GasAuditor     auditor;
    AegisNet       aegis;
    VertexExecutor executor;

    uint256 constant CH1             = 1;
    uint256 constant CH2             = 2;
    uint256 constant DEFAULT_MAX_GAS = 1_000;

    address constant A        = address(0xAAAA);
    address constant B        = address(0xBBBB);
    address constant C        = address(0xCCCC);
    address constant STRANGER = address(0x5757);

    receive() external payable {}

    function setUp() public {
        address expectedExecutor = vm.computeCreateAddress(
            address(this),
            vm.getNonce(address(this)) + 4
        );

        core     = new VertexCore(expectedExecutor);
        pulse    = new PulseState(expectedExecutor);
        auditor  = new GasAuditor(address(this), DEFAULT_MAX_GAS);
        aegis    = new AegisNet(address(this));
        executor = new VertexExecutor(
            address(core), address(pulse), address(auditor), address(aegis), 0
        );

        assertEq(address(executor), expectedExecutor, "nonce offset wrong");

        aegis.authorize(address(this), CH1);
        aegis.authorize(address(this), CH2);
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    function test_ExecuteBatch_SingleOp() public {
        executor.executeBatch(CH1, _accs1(A), _amts1(1000), _phs1("op0"), 0);
        (uint128 bal,,) = core.getPartition(CH1, A);
        assertEq(bal, 1000);
    }

    function test_ExecuteBatch_MultipleOps() public {
        address[] memory accs = new address[](3);
        uint128[] memory amts = new uint128[](3);
        bytes32[] memory phs  = new bytes32[](3);
        accs[0] = A; amts[0] = 100; phs[0] = keccak256("op0");
        accs[1] = B; amts[1] = 200; phs[1] = keccak256("op1");
        accs[2] = C; amts[2] = 300; phs[2] = keccak256("op2");
        executor.executeBatch(CH1, accs, amts, phs, 0);

        (uint128 bA,,) = core.getPartition(CH1, A);
        (uint128 bB,,) = core.getPartition(CH1, B);
        (uint128 bC,,) = core.getPartition(CH1, C);
        assertEq(bA, 100); assertEq(bB, 200); assertEq(bC, 300);
    }

    function test_PulseStateUpdated() public {
        address[] memory accs = new address[](2);
        uint128[] memory amts = new uint128[](2);
        bytes32[] memory phs  = new bytes32[](2);
        accs[0] = A; amts[0] = 500; phs[0] = keccak256("a");
        accs[1] = B; amts[1] = 300; phs[1] = keccak256("b");
        executor.executeBatch(CH1, accs, amts, phs, 0);

        (uint128 vol, uint64 cnt,) = pulse.get(CH1);
        assertEq(vol, 800); assertEq(cnt, 1);
    }

    function test_DisjointChannelsNoInterference() public {
        executor.executeBatch(CH1, _accs1(A), _amts1(777), _phs1("x"), 0);
        executor.executeBatch(CH2, _accs1(A), _amts1(333), _phs1("y"), 0);

        (uint128 b1,,) = core.getPartition(CH1, A);
        (uint128 b2,,) = core.getPartition(CH2, A);
        assertEq(b1, 777); assertEq(b2, 333);
    }

    function test_MultipleBatchesSameChannel() public {
        executor.executeBatch(CH1, _accs1(A), _amts1(100), _phs1("b1"), 0);
        executor.executeBatch(CH1, _accs1(A), _amts1(150), _phs1("b2"), 0);

        (uint128 bal,,) = core.getPartition(CH1, A);
        (, uint64 cnt,) = pulse.get(CH1);
        assertEq(bal, 250); assertEq(cnt, 2);
    }

    // ── AegisNet authorization ────────────────────────────────────────────────

    function test_UnauthorizedCannotExecuteBatch() public {
        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("z"), 0);
    }

    function test_AuthorizedOnOneChannelBlockedOnAnother() public {
        address caller = address(0xCAFE);
        aegis.authorize(caller, CH1);

        vm.prank(caller);
        executor.executeBatch(CH1, _accs1(A), _amts1(50), _phs1("ok"), 0);

        vm.prank(caller);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.executeBatch(CH2, _accs1(A), _amts1(50), _phs1("bad"), 0);
    }

    function test_StorageUntouchedAfterUnauthorizedRevert() public {
        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(999), _phs1("blocked"), 0);

        (uint128 bal,,) = core.getPartition(CH1, A);
        assertEq(bal, 0);
    }

    function test_AfterRevokeCannotExecute() public {
        aegis.revoke(address(this), CH1);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("x"), 0);
    }

    function test_ReAuthorizeAfterRevoke() public {
        aegis.revoke(address(this), CH1);
        aegis.authorize(address(this), CH1);
        executor.executeBatch(CH1, _accs1(A), _amts1(42), _phs1("back"), 0);
        (uint128 bal,,) = core.getPartition(CH1, A);
        assertEq(bal, 42);
    }

    // ── Other revert cases ────────────────────────────────────────────────────

    function test_RevertOnEmptyBatch() public {
        vm.expectRevert(VertexExecutor.EmptyBatch.selector);
        executor.executeBatch(CH1, new address[](0), new uint128[](0), new bytes32[](0), 0);
    }

    function test_RevertOnLengthMismatch() public {
        address[] memory accs = new address[](2);
        uint128[] memory amts = new uint128[](1);
        bytes32[] memory phs  = new bytes32[](2);
        accs[0] = A; accs[1] = B; amts[0] = 1; phs[0] = keccak256("x"); phs[1] = keccak256("y");
        vm.expectRevert(VertexExecutor.LengthMismatch.selector);
        executor.executeBatch(CH1, accs, amts, phs, 0);
    }

    function test_RevertOnZeroChannel() public {
        vm.expectRevert(VertexExecutor.ZeroChannel.selector);
        executor.executeBatch(0, _accs1(A), _amts1(1), _phs1("z"), 0);
    }

    function test_PulseStateOnlyExecutor() public {
        vm.expectRevert(PulseState.OnlyExecutor.selector);
        pulse.record(CH1, 100);
    }

    function test_PulseExecutorIsImmutableAndCorrect() public view {
        assertEq(pulse.executor(), address(executor));
    }

    function test_RevertWhenGasAuditFails() public {
        auditor.setMaxGasPerOp(type(uint256).max / 2);
        vm.expectRevert(VertexExecutor.GasAuditFailed.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(500), _phs1("blocked"), 0);

        (uint128 bal,,) = core.getPartition(CH1, A);
        assertEq(bal, 0);
    }

    // ── Shield PoW tests ──────────────────────────────────────────────────────

    function test_InvalidPoWNonceReverts() public {
        (VertexExecutor exec1, ) = _stackWithDifficulty(1);
        uint256 badNonce = _findInvalidNonce(address(this), CH1, 1);
        vm.expectRevert(VertexExecutor.InvalidPoWNonce.selector);
        exec1.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("bad_pow"), badNonce);
    }

    function test_ValidPoWNoncePassesGuard() public {
        (VertexExecutor exec1, VertexCore core1) = _stackWithDifficulty(1);
        uint256 validNonce = _findValidNonce(address(this), CH1, 1);
        exec1.executeBatch(CH1, _accs1(A), _amts1(77), _phs1("valid_pow"), validNonce);
        (uint128 bal,,) = core1.getPartition(CH1, A);
        assertEq(bal, 77);
    }

    function test_DifficultyIncreasesUnderLoad() public {
        uint256 threshold = executor.DIFFICULTY_HIGH_THRESHOLD();
        for (uint256 i = 0; i < threshold; i++) {
            executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1(abi.encode(i)), 0);
        }
        assertEq(uint256(executor.txCounterThisBlock()), threshold);
        assertEq(executor.currentDifficulty(), uint64(0));

        vm.roll(block.number + 1);

        vm.expectEmit(false, false, false, true);
        emit VertexExecutor.DifficultyUpdated(1, block.number);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("trigger"), 0);

        assertEq(executor.currentDifficulty(), 1);
    }

    function testFuzz_InvalidNonceAlwaysReverts(uint256 badNonce) public {
        (VertexExecutor exec1, ) = _stackWithDifficulty(1);
        bytes32 h = keccak256(abi.encodePacked(address(this), badNonce, CH1));
        vm.assume(uint256(h) >> 252 != 0);
        vm.expectRevert(VertexExecutor.InvalidPoWNonce.selector);
        exec1.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("fuzz"), badNonce);
    }

    // ── Fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_BatchVolumeAccumulates(
        uint256 chId,
        uint128 amt1,
        uint128 amt2
    ) public {
        vm.assume(chId != 0);
        vm.assume(uint256(amt1) + uint256(amt2) <= type(uint128).max);
        vm.assume(amt1 > 0 && amt2 > 0);

        aegis.authorize(address(this), chId);

        address[] memory accs = new address[](2);
        uint128[] memory amts = new uint128[](2);
        bytes32[] memory phs  = new bytes32[](2);
        accs[0] = A; amts[0] = amt1; phs[0] = keccak256("a");
        accs[1] = B; amts[1] = amt2; phs[1] = keccak256("b");
        executor.executeBatch(chId, accs, amts, phs, 0);

        (uint128 vol,,) = pulse.get(chId);
        assertEq(vol, amt1 + amt2);
    }

    // ── processMicropayment tests ─────────────────────────────────────────────

    function test_ProcessMicropayment_HappyPath() public {
        executor.processMicropayment{value: 1 ether}(CH1, block.timestamp, 0);
        (uint128 bal,,) = core.getPartition(CH1, address(this));
        assertEq(bal, 1 ether);
        (, uint64 cnt,) = pulse.get(CH1);
        assertEq(cnt, 1);
    }

    function test_ProcessMicropayment_ZeroValueFallsBackToOne() public {
        executor.processMicropayment{value: 0}(CH1, block.timestamp, 0);
        (uint128 bal,,) = core.getPartition(CH1, address(this));
        assertEq(bal, 1);
    }

    function test_ProcessMicropayment_ZeroChannelReverts() public {
        vm.expectRevert(VertexExecutor.ZeroChannel.selector);
        executor.processMicropayment{value: 0}(0, block.timestamp, 0);
    }

    function test_ProcessMicropayment_UnauthorizedReverts() public {
        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.processMicropayment{value: 0}(CH1, block.timestamp, 0);
    }

    function test_ProcessMicropayment_PoWBlocksWithDifficulty1() public {
        (VertexExecutor exec1, ) = _stackWithDifficulty(1);
        uint256 badNonce = _findInvalidNonce(address(this), CH1, 1);
        vm.expectRevert(VertexExecutor.InvalidPoWNonce.selector);
        exec1.processMicropayment{value: 0}(CH1, block.timestamp, badNonce);
    }

    function testFuzz_ProcessMicropayment_ValueDeposited(uint96 val) public {
        vm.assume(val > 0);
        vm.deal(address(this), val);
        executor.processMicropayment{value: val}(CH1, block.timestamp, 0);
        (uint128 bal,,) = core.getPartition(CH1, address(this));
        assertEq(bal, val);
    }

    // ── circuit breaker ───────────────────────────────────────────────────────

    function test_PausedBlocksExecuteBatch() public {
        executor.setPaused(true);
        vm.expectRevert(VertexExecutor.ContractPaused.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("x"), 0);
    }

    function test_PausedBlocksProcessMicropayment() public {
        executor.setPaused(true);
        vm.expectRevert(VertexExecutor.ContractPaused.selector);
        executor.processMicropayment{value: 0}(CH1, block.timestamp, 0);
    }

    function test_OnlyOwnerCanPause() public {
        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotOwner.selector);
        executor.setPaused(true);
    }

    function test_UnpauseRestoresFunctionality() public {
        executor.setPaused(true);
        executor.setPaused(false);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("resumed"), 0);
        (uint128 bal,,) = core.getPartition(CH1, A);
        assertEq(bal, 1);
    }

    // ── safe cast ─────────────────────────────────────────────────────────────

    function test_ProcessMicropayment_AmountTooLargeReverts() public {
        uint256 bigValue = uint256(type(uint128).max) + 1;
        vm.deal(address(this), bigValue);
        vm.expectRevert(VertexExecutor.AmountTooLarge.selector);
        executor.processMicropayment{value: bigValue}(CH1, block.timestamp, 0);
    }

    // ── batch size ────────────────────────────────────────────────────────────

    function test_BatchTooLargeReverts() public {
        uint256 n = executor.MAX_BATCH_SIZE() + 1;
        address[] memory accs = new address[](n);
        uint128[] memory amts = new uint128[](n);
        bytes32[] memory phs  = new bytes32[](n);
        vm.expectRevert(VertexExecutor.BatchTooLarge.selector);
        executor.executeBatch(CH1, accs, amts, phs, 0);
    }

    function test_ExactlyMaxBatchSizePasses() public {
        uint256 n = executor.MAX_BATCH_SIZE();
        address[] memory accs = new address[](n);
        uint128[] memory amts = new uint128[](n);
        bytes32[] memory phs  = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            accs[i] = address(uint160(i + 1));
            amts[i] = 1;
            phs[i]  = keccak256(abi.encode(i));
        }
        executor.executeBatch(CH1, accs, amts, phs, 0);
    }

    // ── guard order ───────────────────────────────────────────────────────────

    function test_ConstructorRejectsZeroAddresses() public {
        vm.expectRevert(VertexExecutor.ZeroAddress.selector);
        new VertexExecutor(address(0), address(pulse), address(auditor), address(aegis), 0);

        vm.expectRevert(VertexExecutor.ZeroAddress.selector);
        new VertexExecutor(address(core), address(0), address(auditor), address(aegis), 0);

        vm.expectRevert(VertexExecutor.ZeroAddress.selector);
        new VertexExecutor(address(core), address(pulse), address(0), address(aegis), 0);

        vm.expectRevert(VertexExecutor.ZeroAddress.selector);
        new VertexExecutor(address(core), address(pulse), address(auditor), address(0), 0);
    }

    function test_UnauthorizedDoesNotIncrementCounter() public {
        uint64 counterBefore = executor.txCounterThisBlock();

        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotAuthorized.selector);
        executor.executeBatch(CH1, _accs1(A), _amts1(1), _phs1("x"), 0);

        assertEq(executor.txCounterThisBlock(), uint64(counterBefore));
    }

    // ── withdrawETH ───────────────────────────────────────────────────────────

    function test_WithdrawETH_Works() public {
        executor.processMicropayment{value: 1 ether}(CH1, block.timestamp, 0);
        assertEq(address(executor).balance, 1 ether);

        uint256 balBefore = address(this).balance;
        executor.withdrawETH(payable(address(this)));

        assertEq(address(this).balance,    balBefore + 1 ether);
        assertEq(address(executor).balance, 0);
    }

    function test_WithdrawETH_StrangerReverts() public {
        vm.prank(STRANGER);
        vm.expectRevert(VertexExecutor.NotOwner.selector);
        executor.withdrawETH(payable(STRANGER));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _stackWithDifficulty(uint256 diff)
        internal
        returns (VertexExecutor exec_, VertexCore core_)
    {
        address expectedExec = vm.computeCreateAddress(
            address(this),
            vm.getNonce(address(this)) + 4
        );
        core_                  = new VertexCore(expectedExec);
        PulseState  pulse_     = new PulseState(expectedExec);
        GasAuditor  auditor_   = new GasAuditor(address(this), DEFAULT_MAX_GAS);
        AegisNet    aegis_     = new AegisNet(address(this));
        exec_                  = new VertexExecutor(
            address(core_), address(pulse_), address(auditor_), address(aegis_), diff
        );
        aegis_.authorize(address(this), CH1);
        aegis_.authorize(address(this), CH2);
    }

    function _findValidNonce(address sender, uint256 channelId, uint256 diff)
        internal pure returns (uint256 nonce)
    {
        uint256 shiftAmt = diff < 64 ? 256 - diff * 4 : 0;
        for (nonce = 0; ; nonce++) {
            bytes32 h = keccak256(abi.encodePacked(sender, nonce, channelId));
            if (uint256(h) >> shiftAmt == 0) return nonce;
        }
    }

    function _findInvalidNonce(address sender, uint256 channelId, uint256 diff)
        internal pure returns (uint256 nonce)
    {
        uint256 shiftAmt = diff < 64 ? 256 - diff * 4 : 0;
        for (nonce = 1_000_000; ; nonce++) {
            bytes32 h = keccak256(abi.encodePacked(sender, nonce, channelId));
            if (uint256(h) >> shiftAmt != 0) return nonce;
        }
    }

    function _accs1(address a) internal pure returns (address[] memory r) {
        r = new address[](1); r[0] = a;
    }
    function _amts1(uint128 v) internal pure returns (uint128[] memory r) {
        r = new uint128[](1); r[0] = v;
    }
    function _phs1(bytes memory s) internal pure returns (bytes32[] memory r) {
        r = new bytes32[](1); r[0] = keccak256(s);
    }
}
