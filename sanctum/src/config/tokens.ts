export interface Token {
    symbol: string;
    name: string;
    address: `0x${string}`;
    decimals: number;
    logo?: string;
    type?: string;
}

export const TOKENS: Token[] = [
    {
        symbol: "ETH", // Using ETH symbol but mapping to WETH for permits
        name: "Ether",
        address: "0x4200000000000000000000000000000000000006",
        decimals: 18,
        type: "LAYER 1"
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        decimals: 6,
        type: "STABLE"
    }
];

export const TOKEN_MAP = TOKENS.reduce((acc, token) => {
    acc[token.symbol] = token;
    return acc;
}, {} as Record<string, Token>);
