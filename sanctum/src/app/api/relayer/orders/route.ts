import { NextRequest, NextResponse } from 'next/server';
import { RelayerDB } from '@/lib/relayer-db';
import { type GhostPosition } from '@/hooks/useGhostPositions';
import { Redis } from 'ioredis';

// Initialize Redis
// In production, this should use process.env.REDIS_URL
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// GET /api/relayer/orders
export async function GET(request: NextRequest) {
    try {
        const orders = await RelayerDB.getAllOrders();
        return NextResponse.json({ success: true, orders });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
    }
}

// POST /api/relayer/orders
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const order = body.order as GhostPosition;

        if (!order || !order.id || !order.signature) {
            return NextResponse.json({ success: false, error: 'Invalid order data' }, { status: 400 });
        }

        await RelayerDB.saveOrder(order);

        // [NEW] Publish Real-Time Event
        try {
            await redis.publish('ghost_events', JSON.stringify({
                type: 'NEW_ORDER',
                order: order
            }));
            console.log(`[Relayer] Published NEW_ORDER for ${order.id}`);
        } catch (err) {
            console.error("[Relayer] Redis publish failed:", err);
        }

        return NextResponse.json({ success: true, order });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to save order' }, { status: 500 });
    }
}
