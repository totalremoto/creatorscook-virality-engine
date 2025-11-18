import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { scriptEditorService } from '@/lib/script-editor-service';

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

    // Get the script ID
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      );
    }

    // Get the script with brand rules
    const result = await scriptEditorService.getScriptWithBrandRules(id, userId);

    if (!result.script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      script: result.script,
      brand_rules: result.brand_rules
    });

  } catch (error) {
    console.error('Error in GET /api/scripts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the script ID
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      );
    }

    // Update the script
    const script = await scriptEditorService.updateScript(
      id,
      userId,
      content,
      title
    );

    return NextResponse.json({
      success: true,
      script
    });

  } catch (error) {
    console.error('Error in PUT /api/scripts/[id]:', error);
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

    // Get the script ID
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Script ID is required' },
        { status: 400 }
      );
    }

    // Delete the script
    const success = await scriptEditorService.deleteScript(id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete script or script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Script deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/scripts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}