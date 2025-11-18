import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { scriptEditorService } from '@/lib/script-editor-service';

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
    const { product_container_id, title, content, virality_pack_id } = body;

    // Validate required fields
    if (!product_container_id || !title || !content) {
      return NextResponse.json(
        { error: 'Product container ID, title, and content are required' },
        { status: 400 }
      );
    }

    // Create the script
    const script = await scriptEditorService.createScript(
      userId,
      product_container_id,
      title,
      content,
      virality_pack_id
    );

    return NextResponse.json({
      success: true,
      script
    });

  } catch (error) {
    console.error('Error in POST /api/scripts/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}