'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-red-500">Something went wrong!</h2>
            <p className="text-slate-400 max-w-md">{error.message || "An unexpected error occurred."}</p>
            <button
                onClick={() => reset()}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
                Try again
            </button>
        </div>
    );
}
