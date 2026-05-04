import { NextResponse } from 'next/server';
import {
  buildCstProjectCardData,
  createCstProject,
  isMissingCstSchemaError,
  listPdplAuditingMembers,
  listVisibleCstProjects,
  requirePdplActor,
} from '@/utils/auditing-cst';

function createEmptyResponse(actor = null) {
  return {
    setupPending: true,
    actor,
    directoryMembers: [],
    projects: [],
  };
}

export async function GET() {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const { actor } = auth;
    let visibleProjects;
    try {
      visibleProjects = await listVisibleCstProjects(actor);
    } catch (error) {
      if (isMissingCstSchemaError(error)) {
        return NextResponse.json(createEmptyResponse(actor), { status: 200 });
      }
      throw error;
    }

    const [projects, directoryMembers] = await Promise.all([
      buildCstProjectCardData(visibleProjects),
      listPdplAuditingMembers(),
    ]);

    return NextResponse.json(
      {
        setupPending: false,
        actor,
        directoryMembers,
        projects,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading CST projects:', error);
    return NextResponse.json({ error: error.message || 'Failed to load CST projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requirePdplActor();
    if (auth.error) return auth.error;

    const body = await request.json();
    const projectId = await createCstProject(body, auth.actor);

    return NextResponse.json({ projectId }, { status: 201 });
  } catch (error) {
    console.error('Error creating CST project:', error);
    if (isMissingCstSchemaError(error)) {
      return NextResponse.json(
        { error: 'CST audit database setup is pending. Apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to create CST project' }, { status: 500 });
  }
}
