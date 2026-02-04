export interface Token {
    symbol: string;
    name: string;
    address: `0x${string}`;
    decimals: number;
    logo?: string;
    type?: string;
    isNative?: boolean;
}

export const TOKENS: Token[] = [
    {
        symbol: "ETH",
        name: "Ether",
        address: "0x0000000000000000000000000000000000000000", // Native address convention
        decimals: 18,
        type: "LAYER 1",
        isNative: true
    },
    {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0x4200000000000000000000000000000000000006",
        decimals: 18,
        type: "WRAP"
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        decimals: 6,
        type: "STABLE"
    },
    {
        symbol: "eiETH",
        name: "Eidolon ETH",
        address: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6", // Deployed Address
        decimals: 18,
        type: "GENESIS",
        logo: "/eye_of_god.png"
    }
];

export const TOKEN_MAP = TOKENS.reduce((acc, token) => {
    acc[token.symbol] = token;
    return acc;
}, {} as Record<string, Token>);
