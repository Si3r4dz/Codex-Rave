import { NextResponse } from 'next/server';
import { ProjectDetailsService } from '@/lib/services/project-details.service';
import { handleApiError } from '@/lib/utils/api-error';

const projectDetailsService = new ProjectDetailsService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { message: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectDetails = await projectDetailsService.getProjectDetails(projectId);
    return NextResponse.json(projectDetails);
  } catch (error) {
    if (error instanceof Error && error.message === 'No time entries found for this project') {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }
    return handleApiError(error, 'Failed to fetch project details');
  }
}

