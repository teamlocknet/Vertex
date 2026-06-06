// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VertexCore}      from "../src/core/VertexCore.sol";
import {VertexExecutor}  from "../src/core/VertexExecutor.sol";
import {PulseState}      from "../src/core/PulseState.sol";
import {GasAuditor}      from "../src/core/GasAuditor.sol";
import {AegisNet}        from "../src/core/AegisNet.sol";
import {MonolithDemo}    from "../src/core/MonolithDemo.sol";

contract Deploy is Script {
    // PoW disabled for demo — attack script sends plain txs without mining nonces.
    uint256 constant DIFFICULTY  = 0;
    // Gas budget per VertexCore operation (deposit / withdraw).
    uint256 constant GAS_PER_OP  = 50_000;
    // Channels pre-authorized for the attack bots.
    uint256 constant CHANNELS    = 10;

    function run() external {
        uint256 deployerKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ── Deterministic executor address ───────────────────────────────────────
        // Deployment order (nonce offsets from current):
        //   +0 VertexCore  +1 PulseState  +2 GasAuditor  +3 AegisNet  +4 VertexExecutor
        uint256 currentNonce     = vm.getNonce(deployer);
        address expectedExecutor = vm.computeCreateAddress(deployer, currentNonce + 4);

        // ── Vertex ecosystem ─────────────────────────────────────────────────────
        VertexCore     core     = new VertexCore(expectedExecutor);
        PulseState     pulse    = new PulseState(expectedExecutor);
        GasAuditor     auditor  = new GasAuditor(deployer, GAS_PER_OP);
        AegisNet       aegis    = new AegisNet(deployer);
        VertexExecutor executor = new VertexExecutor(
            address(core),
            address(pulse),
            address(auditor),
            address(aegis),
            DIFFICULTY
        );

        require(address(executor) == expectedExecutor, "Deploy: nonce drift - executor address mismatch");

        // ── Monolith (comparison target) ─────────────────────────────────────────
        MonolithDemo monolith = new MonolithDemo();

        // ── Pre-authorize Anvil default wallets on all demo channels ─────────────
        for (uint256 ch = 1; ch <= CHANNELS; ch++) {
            aegis.batchAuthorize(_anvilBots(), ch);
        }

        vm.stopBroadcast();

        // ── Export addresses ─────────────────────────────────────────────────────
        string memory json = string.concat(
            '{\n',
            '  "VertexCore": "',      vm.toString(address(core)),      '",\n',
            '  "VertexExecutor": "',  vm.toString(address(executor)),  '",\n',
            '  "PulseState": "',      vm.toString(address(pulse)),     '",\n',
            '  "GasAuditor": "',      vm.toString(address(auditor)),   '",\n',
            '  "AegisNet": "',        vm.toString(address(aegis)),     '",\n',
            '  "MonolithDemo": "',    vm.toString(address(monolith)),  '"\n',
            '}'
        );

        vm.writeFile("../backend/config/deployments.json", json);

        console.log("========== Vertex Deployment ==========");
        console.log("VertexCore:     ", address(core));
        console.log("VertexExecutor: ", address(executor));
        console.log("PulseState:     ", address(pulse));
        console.log("GasAuditor:     ", address(auditor));
        console.log("AegisNet:       ", address(aegis));
        console.log("MonolithDemo:   ", address(monolith));
        console.log("=======================================");
        console.log("Deployments -> packages/backend/config/deployments.json");
    }

    function _anvilBots() internal pure returns (address[] memory bots) {
        bots    = new address[](10);
        bots[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        bots[1] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        bots[2] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        bots[3] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        bots[4] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;
        bots[5] = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;
        bots[6] = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;
        bots[7] = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955;
        bots[8] = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;
        bots[9] = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;
    }
}
