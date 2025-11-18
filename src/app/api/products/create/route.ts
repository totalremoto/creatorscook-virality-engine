import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProductContainer } from '@/lib/product-service';
import { CreateProductRequest } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { product_url } = body as CreateProductRequest;

    // Validate required fields
    if (!product_url || typeof product_url !== 'string') {
      return NextResponse.json(
        { error: 'Product URL is required' },
        { status: 400 }
      );
    }

    // Create the product container
    const result = await createProductContainer(userId, { product_url });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      product_container: result.product_container
    });

  } catch (error) {
    console.error('Error in POST /api/products/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}