// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrecompileConsumer} from "./utils/PrecompileConsumer.sol";

contract PalmWiseReading is PrecompileConsumer {
    // LLM precompile (GLM-4.7-FP8 via Ritual TEE, no API key required)
    address constant LLM_PRECOMPILE = 0x0000000000000000000000000000000000000802;
    uint256 constant PENDING_TTL = 500; // blocks before auto-expiry

    struct Reading {
        bytes32 readingHash;
        uint256 timestamp;
    }

    struct PendingState {
        bool active;
        uint256 submittedBlock;
    }

    // Represents the updatedConvoHistory tuple returned by the LLM precompile
    struct ConvoHistory {
        string a;
        string b;
        string c;
    }

    mapping(address => Reading[]) private _userReadings;
    mapping(bytes32 => address) public readingOwner;
    mapping(address => PendingState) private _pending;

    event ReadingCreated(address indexed user, bytes32 indexed readingHash, uint256 timestamp);

    // Must be called via sendTransaction, not writeContractAsync.
    // writeContractAsync uses eth_call simulation which reverts on SPC precompiles.
    function submitReading(bytes calldata llmInput) external {
        _checkAutoExpiry(msg.sender);
        require(!_pending[msg.sender].active, "reading already pending");

        _pending[msg.sender] = PendingState(true, block.number);

        bytes memory output = _executePrecompile(LLM_PRECOMPILE, llmInput);

        // During eth_call simulation output is empty — exit gracefully
        if (output.length == 0) {
            _pending[msg.sender].active = false;
            return;
        }

        // LLM precompile response: (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory)
        (bool hasError, bytes memory completionData, , string memory errMsg,) =
            abi.decode(output, (bool, bytes, bytes, string, ConvoHistory));

        _pending[msg.sender].active = false;

        require(!hasError, errMsg);
        require(completionData.length > 0, "empty completion");

        bytes32 hash = keccak256(completionData);
        _userReadings[msg.sender].push(Reading(hash, block.timestamp));
        readingOwner[hash] = msg.sender;

        emit ReadingCreated(msg.sender, hash, block.timestamp);
    }

    function getReadings(address user) external view returns (Reading[] memory) {
        return _userReadings[user];
    }

    function hasPending(address user) external view returns (bool) {
        PendingState memory ps = _pending[user];
        if (!ps.active) return false;
        if (block.number > ps.submittedBlock + PENDING_TTL) return false;
        return true;
    }

    function _checkAutoExpiry(address user) internal {
        PendingState storage ps = _pending[user];
        if (ps.active && block.number > ps.submittedBlock + PENDING_TTL) {
            ps.active = false;
        }
    }
}
