import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'

import getDocumentModel from '@/models/Document'

async function handler(req: NextRequest) {
  try {
    const Model = await getDocumentModel()

    if (req.method === 'GET') {
      const q = req.nextUrl.searchParams.get('q')
      let data
      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i')
        data = await Model.find({
          $or: [
            { title: regex },
            { tags: regex },
            { 'sections.title': regex },
            { 'sections.content': regex },
          ],
        })
      } else {
        data = await Model.find()
      }
      return NextResponse.json({ success: true, data })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const doc = await Model.create({ ...body, owner_user_id: getCurrentUserId() })
      return NextResponse.json({ success: true, data: doc })
    }

    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}

const protectedHandler = authMiddleware(handler)
export const GET = protectedHandler
export const POST = protectedHandler
