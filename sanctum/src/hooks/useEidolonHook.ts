"use client";

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { CONTRACTS } from "@/config/web3";
import EidolonHookJSON from "../abi/EidolonHook.json";

const EidolonHookABI = EidolonHookJSON.abi;

export function useEidolonHook() {
    const { chain } = useAccount();
    const chainId = chain?.id;

    // Get correct addresses for current chain (default to Unichain Sepolia)
    const addresses = chainId === 1301 ? CONTRACTS.unichainSepolia : CONTRACTS.unichainSepolia;

    // READ: Single Sided Fee
    const { data: singleSidedFeeBps, refetch: refetchSingleFee } = useReadContract({
        address: addresses.eidolonHook,
        abi: EidolonHookABI,
        functionName: "singleSidedFeeBps",
    });

    // READ: Dual Sided Fee
    const { data: dualSidedFeeBps, refetch: refetchDualFee } = useReadContract({
        address: addresses.eidolonHook,
        abi: EidolonHookABI,
        functionName: "dualSidedFeeBps",
    });

    // READ: Check Membership
    const { data: isMember, refetch: refetchMembership } = useReadContract({
        address: addresses.eidolonHook,
        abi: EidolonHookABI,
        functionName: "isMember",
        args: [useAccount().address],
        query: {
            enabled: !!useAccount().address,
        }
    });

    // READ: Owner
    const { data: owner } = useReadContract({
        address: addresses.eidolonHook,
        abi: EidolonHookABI,
        functionName: "owner",
    });

    // WRITE: Set Fees (Admin)
    const { writeContractAsync: setFeesAsync, isPending: isSettingFees } = useWriteContract();

    const setFees = async (singleSided: number, dualSided: number) => {
        return setFeesAsync({
            address: addresses.eidolonHook,
            abi: EidolonHookABI,
            functionName: "setFees",
            args: [singleSided, dualSided],
        });
    };

    // WRITE: Add Membership (Admin)
    const { writeContractAsync: addMembershipAsync, isPending: isAddingMember } = useWriteContract();

    const addMembership = async (provider: string, durationInfo: bigint) => {
        return addMembershipAsync({
            address: addresses.eidolonHook,
            abi: EidolonHookABI,
            functionName: "addMembership",
            args: [provider, durationInfo],
        });
    };

    return {
        fees: {
            singleSided: singleSidedFeeBps ? Number(singleSidedFeeBps) / 100 : 20, // Default 20%
            dualSided: dualSidedFeeBps ? Number(dualSidedFeeBps) / 100 : 10,     // Default 10%
            rawSingle: singleSidedFeeBps,
            rawDual: dualSidedFeeBps
        },
        membership: {
            isMember: !!isMember,
            refetch: refetchMembership
        },
        admin: {
            owner,
            setFees,
            isSettingFees,
            addMembership,
            isAddingMember
        },
        refetchFees: () => {
            refetchSingleFee();
            refetchDualFee();
        }
    };
}
