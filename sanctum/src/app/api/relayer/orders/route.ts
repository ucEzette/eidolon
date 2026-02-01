
import { NextRequest, NextResponse } from 'next/server';
import { RelayerDB } from '@/lib/relayer-db';
import { type GhostPosition } from '@/hooks/useGhostPositions';

// GET /api/relayer/orders
export async function GET(request: NextRequest) {
    try {
        const orders = RelayerDB.getAllOrders();
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

        RelayerDB.saveOrder(order);
        return NextResponse.json({ success: true, order });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to save order' }, { status: 500 });
    }
}
