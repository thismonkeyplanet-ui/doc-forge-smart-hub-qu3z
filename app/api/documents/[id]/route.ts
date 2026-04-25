import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import getDocumentModel from '@/models/Document'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const Model = await getDocumentModel()

    if (req.method === 'PUT') {
      const body = await req.json()
      const doc = await Model.findByIdAndUpdate(id, body, { new: true })
      if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
      return NextResponse.json({ success: true, data: doc })
    }

    if (req.method === 'DELETE') {
      const doc = await Model.findByIdAndDelete(id)
      if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}

const protectedHandler = authMiddleware(handler)
export const PUT = protectedHandler
export const DELETE = protectedHandler
