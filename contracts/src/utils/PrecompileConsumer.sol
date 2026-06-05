// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract PrecompileConsumer {
    // Unwraps the SPC async envelope: (simmedInput, actualOutput)
    // Returns empty bytes during eth_call simulation (raw.length == 0)
    function _executePrecompile(address precompile, bytes memory input)
        internal
        returns (bytes memory)
    {
        (bool ok, bytes memory raw) = precompile.call(input);
        require(ok, "precompile call failed");
        if (raw.length == 0) return raw;
        (, bytes memory actual) = abi.decode(raw, (bytes, bytes));
        return actual;
    }
}
