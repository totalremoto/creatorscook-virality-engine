import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserProductContainers, getUserAnalytics } from '@/lib/product-service';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeAnalytics = searchParams.get('include_analytics') === 'true';

    // Get user's product containers
    const containers = await getUserProductContainers(userId);

    if (includeAnalytics) {
      // Get user analytics
      const analytics = await getUserAnalytics(userId);

      return NextResponse.json({
        success: true,
        containers,
        analytics
      });
    }

    return NextResponse.json({
      success: true,
      containers
    });

  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}