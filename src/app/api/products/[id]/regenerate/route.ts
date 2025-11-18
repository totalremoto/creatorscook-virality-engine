import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { angleReasoningService } from '@/lib/angle-reasoning-service';
import { getProductContainerWithAnalysis } from '@/lib/product-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the product container ID
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Product container ID is required' },
        { status: 400 }
      );
    }

    // Verify the product container exists and belongs to the user
    const container = await getProductContainerWithAnalysis(userId, id);
    if (!container) {
      return NextResponse.json(
        { error: 'Product container not found' },
        { status: 404 }
      );
    }

    // Check if analysis is already completed
    if (container.status !== 'completed') {
      return NextResponse.json(
        { error: 'Product analysis must be completed before regenerating virality packs' },
        { status: 400 }
      );
    }

    // Parse request body for options
    const body = await request.json();
    const { focus_areas, tone, target_length } = body;

    // Start the regeneration process
    const success = await angleReasoningService.regenerateViralityPacks(id, {
      focus_areas,
      tone,
      target_length
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to regenerate virality packs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Virality packs regenerated successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/products/[id]/regenerate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}