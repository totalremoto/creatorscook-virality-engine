import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProductContainerWithAnalysis, deleteProductContainer } from '@/lib/product-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Get the product container with analysis
    const container = await getProductContainerWithAnalysis(userId, id);

    if (!container) {
      return NextResponse.json(
        { error: 'Product container not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      container
    });

  } catch (error) {
    console.error('Error in GET /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete the product container
    const success = await deleteProductContainer(userId, id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete product container or container not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Product container deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/products/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}