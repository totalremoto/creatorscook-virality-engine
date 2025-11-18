import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { scriptEditorService } from '@/lib/script-editor-service';

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
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Script content is required for analysis' },
        { status: 400 }
      );
    }

    // Get script with brand rules
    const result = await scriptEditorService.getScriptWithBrandRules(id, userId);

    if (!result.script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 }
      );
    }

    // Analyze the script
    const analysis = await scriptEditorService.analyzeScript(
      id,
      content,
      userId,
      result.brand_rules || undefined
    );

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error in POST /api/scripts/[id]/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}