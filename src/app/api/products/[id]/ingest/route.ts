import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ingestionService } from '@/lib/ingestion-service';
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

    // Check if ingestion is already in progress
    if (container.status === 'scraping' || container.status === 'analyzing') {
      return NextResponse.json(
        { error: 'Ingestion already in progress for this product' },
        { status: 409 }
      );
    }

    // Check if ingestion is already completed
    if (container.status === 'completed') {
      return NextResponse.json(
        { error: 'Product has already been analyzed' },
        { status: 409 }
      );
    }

    // Start the ingestion process
    const jobId = await ingestionService.startIngestion(id, container.product_url);

    return NextResponse.json({
      success: true,
      message: 'Ingestion started successfully',
      job_id: jobId,
      product_url: container.product_url
    });

  } catch (error) {
    console.error('Error in POST /api/products/[id]/ingest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}