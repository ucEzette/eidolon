// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

/// @title WitnessLib
/// @author EIDOLON Protocol
/// @notice Library for encoding and hashing Permit2 Witness data
/// @dev Binds Ghost Permit signatures to specific pool execution contexts
library WitnessLib {
    // ═══════════════════════════════════════════════════════════════════════════
    // TYPE HASHES (EIP-712 compliant)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice The EIP-712 typehash for the WitnessData struct
    /// @dev keccak256("WitnessData(bytes32 poolId,address hook)")
    bytes32 public constant WITNESS_TYPEHASH = 
        keccak256("WitnessData(bytes32 poolId,address hook)");

    /// @notice The witness type string for Permit2
    /// @dev Used when constructing the full EIP-712 typed data
    string public constant WITNESS_TYPE_STRING = 
        "WitnessData witness)TokenPermissions(address token,uint256 amount)WitnessData(bytes32 poolId,address hook)";

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Witness data that binds a signature to a specific pool context
    /// @dev This struct is hashed and included in the Permit2 signature
    struct WitnessData {
        /// @notice The pool ID this signature is valid for (bytes32 form)
        bytes32 poolId;
        /// @notice The Hook address that must be executing this transaction
        address hook;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Hashes the witness data for Permit2 verification
    /// @dev Uses EIP-712 struct hashing
    /// @param witness The witness data to hash
    /// @return The keccak256 hash of the encoded witness
    function hash(WitnessData memory witness) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                WITNESS_TYPEHASH,
                witness.poolId,
                witness.hook
            )
        );
    }

    /// @notice Creates witness data from a PoolId and hook address
    /// @param poolId The Uniswap v4 pool identifier
    /// @param hook The EIDOLON hook address
    /// @return The constructed WitnessData struct
    function createWitness(
        PoolId poolId,
        address hook
    ) internal pure returns (WitnessData memory) {
        return WitnessData({
            poolId: PoolId.unwrap(poolId),
            hook: hook
        });
    }

    /// @notice Validates that the witness matches the current execution context
    /// @dev Reverts if the pool ID doesn't match
    /// @param witness The witness data from the permit
    /// @param expectedPoolId The pool currently being executed
    /// @param expectedHook The expected hook address
    /// @return True if validation passes (reverts otherwise)
    function validate(
        WitnessData memory witness,
        PoolId expectedPoolId,
        address expectedHook
    ) internal pure returns (bool) {
        require(
            witness.poolId == PoolId.unwrap(expectedPoolId),
            "WitnessLib: Pool ID mismatch"
        );
        require(
            witness.hook == expectedHook,
            "WitnessLib: Hook address mismatch"
        );
        return true;
    }
}
