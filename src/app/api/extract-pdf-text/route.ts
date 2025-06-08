import { NextRequest, NextResponse } from 'next/server';

// This API route is deprecated and superseded by process-health-document
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This API endpoint is deprecated. Please use /api/process-health-document instead.' 
  }, { status: 410 });
} 