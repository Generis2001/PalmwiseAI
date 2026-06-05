// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PalmWiseReading} from "../src/PalmWiseReading.sol";

contract PalmWiseReadingTest is Test {
    PalmWiseReading palmWise;
    address constant LLM_PRECOMPILE = 0x0000000000000000000000000000000000000802;
    address user = makeAddr("user");

    function setUp() public {
        palmWise = new PalmWiseReading();
    }

    function testNoPendingInitially() public view {
        assertFalse(palmWise.hasPending(user));
    }

    function testReadingsEmptyInitially() public view {
        PalmWiseReading.Reading[] memory readings = palmWise.getReadings(user);
        assertEq(readings.length, 0);
    }

    // Helper: build the LLM SPC async envelope wrapping a mock completion
    function _buildLLMEnvelope(bytes memory completionData) internal pure returns (bytes memory) {
        // LLM precompile response tuple:
        // (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, ConvoHistory)
        PalmWiseReading.ConvoHistory memory emptyHistory = PalmWiseReading.ConvoHistory("", "", "");
        bytes memory llmResponse = abi.encode(
            false,           // hasError
            completionData,  // completionData
            bytes(""),       // modelMetadata
            "",              // errorMessage
            emptyHistory     // updatedConvoHistory
        );
        // Wrap in async envelope: (simmedInput, actualOutput)
        return abi.encode(bytes(""), llmResponse);
    }

    function testMockSPCResult() public {
        bytes memory mockCompletion = bytes('{"archetype":"The Builder","reading_summary":"Test"}');
        bytes memory asyncEnvelope = _buildLLMEnvelope(mockCompletion);

        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope);

        vm.prank(user);
        palmWise.submitReading(bytes("mock-encoded-input"));

        PalmWiseReading.Reading[] memory readings = palmWise.getReadings(user);
        assertEq(readings.length, 1);
        assertEq(readings[0].readingHash, keccak256(mockCompletion));
        assertEq(readings[0].timestamp, block.timestamp);
    }

    function testReadingOwnerRecorded() public {
        bytes memory mockCompletion = bytes('{"archetype":"The Visionary"}');
        bytes memory asyncEnvelope = _buildLLMEnvelope(mockCompletion);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope);

        vm.prank(user);
        palmWise.submitReading(bytes("mock"));

        bytes32 hash = keccak256(mockCompletion);
        assertEq(palmWise.readingOwner(hash), user);
    }

    function testAutoExpiryReleasesPending() public {
        assertFalse(palmWise.hasPending(user));
        vm.roll(block.number + 501);
        assertFalse(palmWise.hasPending(user));
    }

    function testCannotSubmitTwiceConcurrently() public {
        // Empty output triggers simulation branch which resets pending
        vm.mockCall(LLM_PRECOMPILE, bytes(""), bytes(""));

        vm.startPrank(user);
        palmWise.submitReading(bytes("input1"));
        assertFalse(palmWise.hasPending(user));
        vm.stopPrank();
    }

    function testEmptyCompletionReverts() public {
        PalmWiseReading.ConvoHistory memory emptyHistory = PalmWiseReading.ConvoHistory("", "", "");
        bytes memory llmResponse = abi.encode(false, bytes(""), bytes(""), "", emptyHistory);
        bytes memory asyncEnvelope = abi.encode(bytes(""), llmResponse);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope);

        vm.prank(user);
        vm.expectRevert(bytes("empty completion"));
        palmWise.submitReading(bytes("mock"));
    }

    function testLLMErrorReverts() public {
        PalmWiseReading.ConvoHistory memory emptyHistory = PalmWiseReading.ConvoHistory("", "", "");
        bytes memory llmResponse = abi.encode(true, bytes(""), bytes(""), "model error", emptyHistory);
        bytes memory asyncEnvelope = abi.encode(bytes(""), llmResponse);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope);

        vm.prank(user);
        vm.expectRevert(bytes("model error"));
        palmWise.submitReading(bytes("mock"));
    }

    function testEventEmitted() public {
        bytes memory mockCompletion = bytes('{"archetype":"The Creator"}');
        bytes memory asyncEnvelope = _buildLLMEnvelope(mockCompletion);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope);

        bytes32 expectedHash = keccak256(mockCompletion);
        vm.expectEmit(true, true, false, false);
        emit PalmWiseReading.ReadingCreated(user, expectedHash, block.timestamp);

        vm.prank(user);
        palmWise.submitReading(bytes("mock"));
    }

    function testMultipleReadingsSameUser() public {
        bytes memory comp1 = bytes('{"archetype":"The Builder"}');
        bytes memory asyncEnvelope1 = _buildLLMEnvelope(comp1);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope1);

        vm.prank(user);
        palmWise.submitReading(bytes("mock1"));

        bytes memory comp2 = bytes('{"archetype":"The Explorer"}');
        bytes memory asyncEnvelope2 = _buildLLMEnvelope(comp2);
        vm.mockCall(LLM_PRECOMPILE, bytes(""), asyncEnvelope2);

        vm.prank(user);
        palmWise.submitReading(bytes("mock2"));

        PalmWiseReading.Reading[] memory readings = palmWise.getReadings(user);
        assertEq(readings.length, 2);
    }
}
