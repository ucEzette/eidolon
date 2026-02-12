from web3 import Web3
from eth_abi import encode
import os

# Constants
POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F"
WETH = "0x4200000000000000000000000000000000000006"
HOOK = "0x296bA69b1F79d0eb0Ca812C5cf58FC2f4C0Bb0C8" # Default Eidolon Hook
FEE = 3000
TICK_SPACING = 60

# Check permutations just in case
keys = [
    (USDC, WETH, FEE, TICK_SPACING, HOOK),
    (USDC, WETH, FEE, TICK_SPACING, "0x0000000000000000000000000000000000000000"), # No Hook
]

for t0, t1, f, ts, h in keys:
    # Ensure sorted
    if t0.lower() > t1.lower():
        t0, t1 = t1, t0
    
    encoded = encode(['address', 'address', 'uint24', 'int24', 'address'], [t0, t1, f, ts, h])
    pool_id = Web3.keccak(encoded)
    print(f"Checking Pool: {t0} / {t1} | Hook: {h}")
    print(f"Pool ID: {pool_id.hex()}")
    
    # Slot0 is usually at slot mapping(bytes32 poolId => Pool.State)
    # Mapping base slot is 0 in PoolManager? No, PoolManager storage layout is complex.
    # But I can call getPoolState or similar if exposed?
    # Actually PoolManager has  which takes a slot.
    # The slot for Pool.State is keccak(poolId, 0) usually? Or defined in libraries.
    # Actually PoolManager stores pools in a mapping at slot 0? Or 1?
    # Let's just try to call  if it exists, or .
    # But PoolManager v4 doesn't have  publicly usually, uses .
    
    # Actually, the quickest way is to just call  with the slot for .
    # In V4,  mapping is at slot 6? No.
    # Let's try to assume slot 0 for pools mapping.
    # keccak(poolId . 0)
