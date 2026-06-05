// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PalmWiseReading} from "../src/PalmWiseReading.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deploying PalmWiseReading from:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);
        PalmWiseReading palmWise = new PalmWiseReading();
        vm.stopBroadcast();

        console.log("PalmWiseReading deployed at:", address(palmWise));
    }
}
